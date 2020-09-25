from transformer_decoder_model import TransformerModel,NetworkInterface,\
    FramedRAMDataStorage,FramedDataProvider,CustomPitchShifter
import os
import numpy as np
import matplotlib.pyplot as plt
from librosa import midi_to_note

def plot_weight(model,tokens):
    result,attn=model.inference(tokens)
    result[:,1]=0.0
    print('PD:',np.argmax(result,axis=1))
    print('GT:',tokens)
    print('GT:',' '.join(midi_to_note(x-2) if x>=2 else ['<n>','<s>'][x] for x in tokens))
    print('PB:',np.max(result,axis=1))
    tokens_one_hot=np.eye(result.shape[1])[tokens]
    fig, ax = plt.subplots(nrows=2, ncols=1, sharex='all')
    ax[0].imshow(result.T, interpolation='nearest', aspect='auto')
    ax[0].invert_yaxis()
    ax[1].imshow(tokens_one_hot.T, interpolation='nearest', aspect='auto')
    ax[1].invert_yaxis()
    plt.show()
    #plt.imshow(recover_attention_matrix(attn,TOKENS_PER_BAR).T)
    #plt.show()
if __name__ == '__main__':
    model=NetworkInterface(TransformerModel(
        n_vocabulary=128+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,dropout=0.5),
        'transformer_chpop_v1.0_relative_pe_3_layers_early_stopping.best',load_checkpoint=False)

    plot_weight(model,np.array([71,1,73,1,74,1,69,1,67,1,1,1,66,1,1,1,
                          71,1,73,1,74,1,69,1,67,1,1,1,66,1,1,1]
                          ))
    plot_weight(model,np.array([i+12 if i>1 else i for i in [57,1,59,1,57,1,55,1,54,1,52,1,50,1,1,1,
                          55,1,57,1,55,1,54,1,52,1,50,1,49,1,1,1]]
                          ))
    plot_weight(model,np.array([62,1,64,1,66,1,67,1,69,1,66,1,62,1,57,1,
                                64,1,66,1,68,1,69,1,71,1,68,1,64,1,59,1]
                          ))
    exit(0)
    dataset_name='nottingham_note_chords'
    storage_x=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/%s'%dataset_name))
    storage_x.load()
    f=open('./data/%s.split.txt'%dataset_name,'r')
    tokens=[line.strip().split(',') for line in f.readlines() if line.strip()!='']
    test_indices=[int(id) for id in tokens[2]]
    print('Using %d samples to test'%len(test_indices))
    test_provider=FramedDataProvider(train_sample_length=-1,shift_low=0,shift_high=0,
                                      num_workers=0,allow_truncate=True,average_samples_per_song=1)
    test_provider.link(storage_x,CustomPitchShifter(),subrange=test_indices)

    # for i in range(test_provider.get_length()):
    #     plot_weight(model,test_provider.get_sample(i)[0])
