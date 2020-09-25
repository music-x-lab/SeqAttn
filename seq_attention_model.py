from mir.nn.train import NetworkBehavior,NetworkInterface
from mir.nn.data_storage import FramedRAMDataStorage
from mir.nn.data_provider import FramedDataProvider
import torch.nn as nn
import torch.nn.functional as F
import torch
import numpy as np
from music_base import SHIFT_LOW,SHIFT_HIGH
from custom_pitch_shifter import N_MIDI_PITCH,CustomPitchShifter
from modules.dropout import random_attention_dropout

TRAIN_LENGTH_IN_TOKENS=256

class PairedLSTMPredictor(nn.Module):

    def __init__(self,emb_size,context_dim,hidden_dim,output_dim,n_head,use_cond):
        super(PairedLSTMPredictor, self).__init__()
        self.lstm=nn.LSTM(
            input_size=2*emb_size+context_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            num_layers=1,
            bidirectional=False
        )
        self.n_head=n_head
        self.hidden_dim=hidden_dim
        self.fc1_a=nn.Linear(hidden_dim,hidden_dim)
        self.fc1_b=nn.Linear(emb_size,hidden_dim)
        if(use_cond):
            self.fc1_c=nn.Linear(emb_size,hidden_dim)
        self.fc2=nn.Linear(hidden_dim,hidden_dim)
        self.fc3_weight=nn.Linear(hidden_dim,n_head)
        self.fc3_pred=nn.Linear(hidden_dim,output_dim*n_head)

    def forward(self, ref_emb, target_emb, context=None, cond=None):
        '''

        :param ref_emb: (batch_size, seq_length, emb_dim)
        :param target_emb: (batch_size, seq_length, emb_dim)
        :param context: (batch_size, context_dim)
        :return: pred (batch_size, seq_length, output_dim, n_head) and
            weight (batch_size, seq_length, n_head)
        '''
        batch_size=ref_emb.shape[0]
        seq_length=target_emb.shape[1]
        h0=torch.zeros(1,batch_size,self.hidden_dim,device=ref_emb.device)
        c0=torch.zeros(1,batch_size,self.hidden_dim,device=ref_emb.device)
        if(context is not None):
            context=context[:,None,:].expand(batch_size,seq_length,-1)
            input_seq=torch.cat((ref_emb,target_emb,context),dim=2)
        else:
            input_seq=torch.cat((ref_emb,target_emb),dim=2)
        hs,_=self.lstm(input_seq,(h0,c0))
        hs=torch.cat((h0.transpose(0,1),hs[:,:-1,:]),dim=1)
        if(cond is None):
            hs=F.relu(self.fc1_a(hs)+self.fc1_b(ref_emb))
        else:
            hs=F.relu(self.fc1_a(hs)+self.fc1_b(ref_emb)+self.fc1_c(cond))
        hs=F.relu(self.fc2(hs))
        weight=self.fc3_weight(hs)
        pred=self.fc3_pred(hs).view(batch_size,seq_length,-1,self.n_head)
        return pred,weight

class SelfAttentionLayer(nn.Module):

    def __init__(self,emb_size,hidden_dim,n_head,n_rel_pos,use_cond,tokens_per_bar):
        super(SelfAttentionLayer, self).__init__()
        self.tokens_per_bar=tokens_per_bar
        self.emb_size=emb_size
        self.hidden_dim=hidden_dim
        self.n_head=n_head
        self.n_rel_pos=n_rel_pos
        self.relative_position_encoding=nn.Embedding(n_rel_pos,emb_size)
        self.inner_model=PairedLSTMPredictor(emb_size=emb_size,
                                             context_dim=emb_size,
                                             hidden_dim=hidden_dim,
                                             output_dim=emb_size,
                                             n_head=n_head,
                                             use_cond=use_cond)
        self.final_fc=nn.Linear(n_head*emb_size,emb_size)

    def forward(self,emb,cond=None,dropout=0.0):
        batch_size,seq_length,_=emb.shape
        group_distance=[2**i for i in range(int(np.log2(self.tokens_per_bar)))]+[(i+1)*self.tokens_per_bar for i in range(seq_length//self.tokens_per_bar)]
        groups=[
                torch.cat((torch.zeros((batch_size,d,self.emb_size),
                                       device=emb.device,dtype=emb.dtype),
                           emb[:,:seq_length-d,:]),dim=1) if d>=0 else
                torch.cat((emb[:,-d:,:],torch.zeros((batch_size,-d,self.emb_size),
                                                    device=emb.device,dtype=emb.dtype)),dim=1)
            for d in group_distance
        ]
        groups=torch.stack(groups,dim=1)
        # groups.shape: (batch_size, group_count, seq_length, emb_size)
        group_count=groups.shape[1]
        rel_position=torch.arange(group_count,device=emb.device)
        rel_position[rel_position>=self.n_rel_pos]=self.n_rel_pos-1
        rel_position=self.relative_position_encoding(rel_position)
        rel_position=rel_position.view(1,group_count,self.emb_size).expand(batch_size,group_count,self.emb_size).contiguous()
        context=rel_position
        emb_expand=emb[:,None,:,:].expand_as(groups).contiguous()
        if cond is not None:
            cond_expand=cond[:,None,:,:].expand_as(groups).contiguous()
        pred,weight=self.inner_model(groups.view(batch_size*group_count,seq_length,self.emb_size),
                                      emb_expand.view(batch_size*group_count,seq_length,self.emb_size),
                                     context=context.view(batch_size*group_count,self.emb_size),
                                     cond=None if cond is None else cond_expand.view(batch_size*group_count,seq_length,self.emb_size))
        pred=pred.view(batch_size,group_count,seq_length,self.emb_size,self.n_head)
        weight=weight.view(batch_size,group_count,seq_length,1,self.n_head)
        if(dropout>0.0):
            mask=random_attention_dropout(weight,dropout,keep_dim=1)
            weight[~mask]=-np.inf
        attention=torch.softmax(weight,dim=1)
        values=torch.sum(attention*pred,dim=1)
        values=values.view(batch_size,seq_length,self.emb_size*self.n_head)
        return self.final_fc(values),attention

class SequentialAttentionPredictorV2(NetworkBehavior):

    def __init__(self,n_vocabulary,emb_size,hidden_dim,n_head,n_rel_pos,tokens_per_bar,dropout):
        super(SequentialAttentionPredictorV2, self).__init__()
        self.n_vocabulary=n_vocabulary
        self.embedding=nn.Embedding(n_vocabulary,emb_size)
        self.attn=SelfAttentionLayer(emb_size=emb_size,
                                     hidden_dim=hidden_dim,
                                     n_head=n_head,
                                     n_rel_pos=n_rel_pos,
                                     use_cond=False,
                                     tokens_per_bar=tokens_per_bar)
        self.final_fc=nn.Linear(emb_size,n_vocabulary)
        self.dropout=dropout

    def forward(self, input_seq, dropout):
        emb=self.embedding(input_seq)
        emb,attention=self.attn(emb, dropout=dropout)
        return self.final_fc(emb),attention

    def loss(self, input_seq):
        pred,_=self(input_seq, self.dropout if self.training else 0.0) # do not use dropout in validation
        return F.cross_entropy(pred.view(-1,self.n_vocabulary),input_seq.view(-1))

    def inference(self, input_seq):
        pred,attention=self(input_seq[None],dropout=0.0)
        return F.softmax(pred,dim=2).squeeze(0).cpu().numpy(),\
               attention.squeeze(3).squeeze(0).cpu().numpy()

    def inference_relationship(self, ref_seq, query_seq):
        ref_emb=self.embedding(ref_seq[None])
        query_emb=self.embedding(query_seq[None])
        result=[]
        for i in range(self.n_vocabulary):
            value_token=torch.tensor([[i]],device=ref_seq.device)
            value_emb=self.embedding(value_token)
            pred,weight=self.inner_model(
                torch.cat((ref_emb,value_emb),dim=1),
                torch.cat((query_emb,value_emb),dim=1)
            )
            result.append(pred[:,-1,:])
        result=torch.cat(result,dim=0)
        result=self.final_fc(result)
        result=F.softmax(result,dim=1).cpu().numpy()
        return result

if __name__ == '__main__':
    import os, sys
    dataset_name=sys.argv[1]
    bar_alignment=int(sys.argv[2])
    storage_x=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/%s_note_chords'%dataset_name))
    storage_x.load_meta()
    f=open('./data/%s_note_chords.split.txt'%dataset_name,'r')
    tokens=[line.strip().split(',') for line in f.readlines() if line.strip()!='']
    train_indices=[int(id) for id in tokens[0]]
    val_indices=[int(id) for id in tokens[1]]
    print('Using %d samples to train'%len(train_indices))
    print('Using %d samples to val'%len(val_indices))
    train_provider=FramedDataProvider(train_sample_length=TRAIN_LENGTH_IN_TOKENS,shift_low=SHIFT_LOW,shift_high=SHIFT_HIGH,
                                      num_workers=0,allow_truncate=True,average_samples_per_song=1)
    train_provider.link(storage_x,CustomPitchShifter(fixed_length=TRAIN_LENGTH_IN_TOKENS),subrange=train_indices)

    val_provider=FramedDataProvider(train_sample_length=-1,shift_low=0,shift_high=0,
                                    num_workers=0,allow_truncate=True,average_samples_per_song=1)

    val_provider.link(storage_x,CustomPitchShifter(fixed_length=TRAIN_LENGTH_IN_TOKENS),subrange=val_indices)
    trainer=NetworkInterface(SequentialAttentionPredictorV2(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=bar_alignment,dropout=0.5),
        'seq_attn_%s_align_%d_v3.0_dropout_early_stopping'%(dataset_name,bar_alignment),load_checkpoint=True)
    trainer.train_supervised(train_provider,val_provider,batch_size=8,
                                     learning_rates_dict={1e-4:200},round_per_print=10,round_per_val=-1,round_per_save=200,
                             early_end_epochs=20,val_batch_size=8)
