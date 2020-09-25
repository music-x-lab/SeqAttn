from mir.nn.train import NetworkBehavior,NetworkInterface
from mir.nn.data_storage import FramedRAMDataStorage
from mir.nn.data_provider import FramedDataProvider
import torch.nn as nn
import torch.nn.functional as F
import torch
import numpy as np
from music_base import SHIFT_LOW,SHIFT_HIGH
from torch.nn.modules.transformer import Transformer
from modules.transformers import TransformerWithRelativePositionalEncoding,AbsolutePositionalEncoding
from custom_pitch_shifter import N_MIDI_PITCH,CustomPitchShifter,CustomChordPitchShifter
TRAIN_LENGTH_IN_TOKENS=256

class TransformerEncoderDecoderModel(NetworkBehavior):

    def __init__(self,n_vocabulary,emb_size,dim_feed_forward,n_head,n_layers,input_cond_shape,dropout):
        super(TransformerEncoderDecoderModel, self).__init__()
        self.n_vocabulary=n_vocabulary
        self.emb_size=emb_size
        self.embedding=nn.Embedding(n_vocabulary+1,emb_size) # extra token for SOS
        self.final_fc=nn.Linear(emb_size,n_vocabulary)
        self.positional_encoding=AbsolutePositionalEncoding(
            d_model=emb_size,
            dropout=dropout
        )
        self.tgt_mask=None
        self.cond_linear=nn.Linear(input_cond_shape,emb_size)
        self.inner_model=TransformerWithRelativePositionalEncoding(
            d_model=emb_size,
            nhead=n_head,
            min_dist=-TRAIN_LENGTH_IN_TOKENS,
            max_dist=TRAIN_LENGTH_IN_TOKENS,
            num_encoder_layers=n_layers,
            num_decoder_layers=n_layers,
            dim_feedforward=dim_feed_forward,
            dropout=dropout
        )

    def _generate_square_subsequent_mask(self, sz):
        mask = (torch.triu(torch.ones(sz, sz)) == 1).transpose(0, 1)
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask

    def forward(self, input_seq, input_cond):
        batch_size,seq_length=input_seq.shape
        if self.tgt_mask is None or self.tgt_mask.size(0) != seq_length:
            mask = self._generate_square_subsequent_mask(seq_length).to(input_seq.device)
            self.tgt_mask = mask

        decoder_input_seq=torch.cat((torch.full((batch_size,1),self.n_vocabulary,
                                     device=input_seq.device,dtype=input_seq.dtype),
                                     input_seq[:,:-1]),dim=1)
        emb_encoder=self.cond_linear(input_cond)
        emb_encoder=self.positional_encoding(emb_encoder)
        emb_decoder=self.embedding(decoder_input_seq)
        emb_decoder=self.positional_encoding(emb_decoder)
        result=self.inner_model(emb_encoder.transpose(0,1),emb_decoder.transpose(0,1),
                                tgt_mask=self.tgt_mask).transpose(0,1)
        return self.final_fc(result)

    def loss(self, input_seq, input_cond):
        pred=self(input_seq, input_cond)
        return F.cross_entropy(pred.view(-1,self.n_vocabulary),input_seq.view(-1))

    def inference(self, input_seq, input_cond):
        pred=self(input_seq[None], input_cond[None])
        return F.softmax(pred,dim=2).squeeze(0).cpu().numpy(),None

if __name__ == '__main__':
    import os, sys
    dataset_name=sys.argv[1]
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
    trainer=NetworkInterface(TransformerEncoderDecoderModel(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,input_cond_shape=36,dropout=0.5),
        'cond_transformer_%s_v1.0_relative_pe_3_layers_early_stopping'%dataset_name,load_checkpoint=True)
    trainer.train_supervised(train_provider,val_provider,batch_size=8,
                                     learning_rates_dict={1e-4:2000},round_per_print=100,round_per_val=-1,round_per_save=200,
                             early_end_epochs=40,val_batch_size=8)
