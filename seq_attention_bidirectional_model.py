from mir.nn.train import NetworkBehavior,NetworkInterface
from mir.nn.data_storage import FramedRAMDataStorage
from mir.nn.data_provider import FramedDataProvider
import torch.nn as nn
import torch.nn.functional as F
import torch
import numpy as np
from music_base import SHIFT_LOW,SHIFT_HIGH
from custom_pitch_shifter import CustomChordPitchShifter,CustomPitchShifter,N_MIDI_PITCH
from modules.dropout import random_attention_dropout

TRAIN_LENGTH_IN_TOKENS=256


class PairedBiLSTMPredictor(nn.Module):

    def __init__(self,emb_size,cond_size,context_dim,hidden_dim,output_dim,n_head):
        super(PairedBiLSTMPredictor, self).__init__()
        self.forward_lstm=nn.LSTM(
            input_size=2*emb_size+2*cond_size+context_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            num_layers=1,
            bidirectional=False
        )
        self.backward_lstm=nn.LSTM(
            input_size=2*cond_size+context_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            num_layers=1,
            bidirectional=False
        )
        self.n_head=n_head
        self.hidden_dim=hidden_dim
        self.fc1_a1=nn.Linear(hidden_dim,hidden_dim)
        self.fc1_a2=nn.Linear(hidden_dim,hidden_dim)
        self.fc1_b=nn.Linear(emb_size,hidden_dim)
        self.fc2=nn.Linear(hidden_dim,hidden_dim)
        self.fc3_weight=nn.Linear(hidden_dim,n_head)
        self.fc3_pred=nn.Linear(hidden_dim,output_dim*n_head)

    def forward(self, ref_emb, ref_cond, target_emb, target_cond, context=None):
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
            forward_seq=torch.cat((ref_emb,ref_cond,target_emb,target_cond,context),dim=2)
            backward_seq=torch.cat((ref_cond,target_cond,context),dim=2)
        else:
            forward_seq=torch.cat((ref_emb,ref_cond,target_emb,target_cond),dim=2)
            backward_seq=torch.cat((ref_cond,target_cond),dim=2)
        hs_forward,_=self.forward_lstm(forward_seq,(h0,c0))
        hs_backward,_=self.backward_lstm(torch.flip(backward_seq,dims=[1]),(h0,c0))
        hs_forward=torch.cat((h0[0,:,None,:],hs_forward[:,:-1,:]),dim=1)
        hs_backward=torch.flip(hs_backward,dims=[1])
        hs=F.relu(self.fc1_a1(hs_forward)+self.fc1_a2(hs_backward)+self.fc1_b(ref_emb))
        hs=F.relu(self.fc2(hs))
        weight=self.fc3_weight(hs)
        pred=self.fc3_pred(hs).view(batch_size,seq_length,-1,self.n_head)
        return pred,weight


class BiDirectionalSelfAttentionLayer(nn.Module):

    def __init__(self,emb_size,cond_size,hidden_dim,n_head,n_rel_pos,tokens_per_bar,use_normalization=False):
        super(BiDirectionalSelfAttentionLayer, self).__init__()
        self.emb_size=emb_size
        self.cond_size=cond_size
        self.hidden_dim=hidden_dim
        self.n_head=n_head
        self.n_rel_pos=n_rel_pos
        self.tokens_per_bar=tokens_per_bar
        self.relative_position_encoding=nn.Embedding(n_rel_pos,emb_size)
        self.inner_model=PairedBiLSTMPredictor(emb_size=emb_size,
                                               cond_size=cond_size,
                                               context_dim=emb_size,
                                               hidden_dim=hidden_dim,
                                               output_dim=emb_size,
                                               n_head=n_head)
        self.final_fc=nn.Linear(n_head*emb_size,emb_size)
        self.use_normalization=use_normalization
        if(self.use_normalization):
            self.layer_norm=nn.LayerNorm(emb_size)

    def forward(self,emb,cond,dropout):
        batch_size,seq_length,_=emb.shape
        group_distance=[2**i for i in range(int(np.log2(self.tokens_per_bar)))]+[(i+1)*self.tokens_per_bar for i in range(seq_length//self.tokens_per_bar)]
        groups=[torch.stack([
                torch.cat((torch.zeros((batch_size,d,seq_size),
                                       device=seq.device,dtype=seq.dtype),
                           seq[:,:seq_length-d,:]),dim=1) if d>=0 else
                torch.cat((seq[:,-d:,:],torch.zeros((batch_size,-d,seq_size),
                                                    device=seq.device,dtype=seq.dtype)),dim=1)
            for d in group_distance
        ],dim=1) for seq,seq_size in [(emb,self.emb_size),(cond,self.cond_size)]]
        # groups.shape: (batch_size, group_count, seq_length, emb_size)
        group_count=groups[0].shape[1]
        rel_position=torch.arange(group_count,device=emb.device)
        rel_position[rel_position>=self.n_rel_pos]=self.n_rel_pos-1
        rel_position=self.relative_position_encoding(rel_position)
        rel_position=rel_position.view(1,group_count,self.emb_size).expand(batch_size,group_count,self.emb_size).contiguous()
        context=rel_position
        emb_expand=emb[:,None,:,:].expand_as(groups[0]).contiguous()
        cond_expand=cond[:,None,:,:].expand_as(groups[1]).contiguous()
        pred,weight=self.inner_model(groups[0].view(batch_size*group_count,seq_length,self.emb_size),
                                     groups[1].view(batch_size*group_count,seq_length,self.cond_size),
                                     emb_expand.view(batch_size*group_count,seq_length,self.emb_size),
                                     cond_expand.view(batch_size*group_count,seq_length,self.cond_size),
                                     context=context.view(batch_size*group_count,self.emb_size))
        pred=pred.view(batch_size,group_count,seq_length,self.emb_size,self.n_head)
        weight=weight.view(batch_size,group_count,seq_length,1,self.n_head)
        if(dropout>0.0):
            mask=random_attention_dropout(weight,dropout,keep_dim=1)
            weight[~mask]=-np.inf
        attention=torch.softmax(weight,dim=1)
        values=torch.sum(attention*pred,dim=1)
        values=values.view(batch_size,seq_length,self.emb_size*self.n_head)
        values=self.final_fc(values)
        if(self.use_normalization):
            values=self.layer_norm(values)
        return values,attention

class ConditionalSequentialAttentionPredictor(NetworkBehavior):

    def __init__(self,n_vocabulary,emb_size,cond_size,hidden_dim,n_head,n_rel_pos,input_cond_shape,tokens_per_bar,dropout):
        super(ConditionalSequentialAttentionPredictor, self).__init__()
        self.n_vocabulary=n_vocabulary
        self.embedding=nn.Embedding(n_vocabulary,emb_size)
        self.tokens_per_bar=tokens_per_bar
        self.cond_linear=nn.Linear(input_cond_shape,cond_size)
        self.attn=BiDirectionalSelfAttentionLayer(emb_size=emb_size,
                                                  cond_size=cond_size,
                                                  hidden_dim=hidden_dim,
                                                  n_head=n_head,
                                                  n_rel_pos=n_rel_pos,
                                                  tokens_per_bar=tokens_per_bar)
        self.final_fc=nn.Linear(emb_size,n_vocabulary)
        self.dropout=dropout

    def forward(self, input_seq, input_cond, dropout):
        cond=self.cond_linear(input_cond)
        emb=self.embedding(input_seq)
        emb,attention=self.attn(emb,cond,dropout=dropout)
        return self.final_fc(emb),attention

    def loss(self, input_seq, input_cond):
        pred,_=self(input_seq, input_cond, self.dropout if self.training else 0.0) # do not use dropout in validation
        return F.cross_entropy(pred.view(-1,self.n_vocabulary),input_seq.view(-1))

    def inference(self, input_seq, input_cond):
        pred,attention=self(input_seq[None],input_cond[None],dropout=0.0)
        return F.softmax(pred,dim=2).squeeze(0).cpu().numpy(),\
               attention.squeeze(3).squeeze(0).cpu().numpy()

    def conditional_generation(self, input_seq, input_cond, temperature=1.0):
        seq_length=len(input_cond)
        masked_pos=len(input_seq)
        assert(masked_pos<=seq_length and masked_pos>=0)
        result_seq=torch.zeros((seq_length,),dtype=input_seq.dtype,device=input_seq.device)
        result_seq[:masked_pos]=input_seq
        result_seq=result_seq[None]
        input_cond=input_cond[None]
        cond=self.cond_linear(input_cond)
        emb=self.embedding(result_seq)
        for i in range(masked_pos,seq_length):
            if(i==seq_length-1 or i%20==0):
                print('%d/%d'%(i,seq_length))
            pred,attention=self.attn(emb,cond,dropout=0.0)
            prob=F.softmax(self.final_fc(pred[:,i,:]),dim=1)
            if(temperature==np.inf):
                token=torch.max(prob[:,:],dim=1).indices
            else:
                prob=prob**temperature
                prob/=prob.sum(dim=1)
                token=torch.distributions.Categorical(prob).sample()
            result_seq[:,i]=token
            emb[:,i,:]=self.embedding(token)
        return result_seq.squeeze(0).cpu().numpy()


def sanity_check():
    net=BiDirectionalSelfAttentionLayer(
        emb_size=256,
        cond_size=128,
        hidden_dim=512,
        n_head=4,
        n_rel_pos=8,
        tokens_per_bar=16
    )
    result=net(
        torch.randn((8,101,256)),
        torch.randn((8,101,128)),
    )
    print(result[1].shape)

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
    train_provider.link(storage_x,CustomChordPitchShifter(fixed_length=TRAIN_LENGTH_IN_TOKENS),subrange=train_indices)

    val_provider=FramedDataProvider(train_sample_length=-1,shift_low=0,shift_high=0,
                                    num_workers=0,allow_truncate=True,average_samples_per_song=1)

    val_provider.link(storage_x,CustomPitchShifter(fixed_length=TRAIN_LENGTH_IN_TOKENS),subrange=val_indices)
    val_provider.link(storage_x,CustomChordPitchShifter(fixed_length=TRAIN_LENGTH_IN_TOKENS),subrange=val_indices)
    trainer=NetworkInterface(ConditionalSequentialAttentionPredictor(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,cond_size=128,
        input_cond_shape=36,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=bar_alignment,dropout=0.5),
        'cond_seq_attn_%s_align_%d_v3.0_dropout_early_stopping'%(dataset_name,bar_alignment),load_checkpoint=True)
    trainer.train_supervised(train_provider,val_provider,batch_size=8,
                                     learning_rates_dict={1e-4:400},round_per_print=10,round_per_val=-1,round_per_save=200,
                             early_end_epochs=20,val_batch_size=8)
