from seq_attention_model import SequentialAttentionPredictorV2,NetworkInterface,\
    FramedRAMDataStorage,FramedDataProvider,CustomPitchShifter
import os
import numpy as np
import matplotlib.pyplot as plt
from evaluation_metrics import get_dataset_split,evaluate_all
from librosa import midi_to_note

def token_to_note(x):
    return midi_to_note(x-2) if x>=2 else ['(n)','(s)'][x]

def plot_weight(model,tokens,target_pos):
    result,attn=model.inference(tokens)
    print('GT:',' '.join(token_to_note(x) for x in tokens))
    print('GT:',token_to_note(tokens[target_pos]))

    print('PD:',token_to_note(np.argmax(result,axis=1)[target_pos]))
    print('PB:',np.max(result,axis=1)[target_pos])
    result[target_pos][np.argmax(result,axis=1)[target_pos]]=0
    print('PD2:',token_to_note(np.argmax(result,axis=1)[target_pos]))
    print('PB2:',np.max(result,axis=1)[target_pos])

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
    model=NetworkInterface(SequentialAttentionPredictorV2(
        n_vocabulary=128+2,emb_size=256,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=16,dropout=0.5),
        'seq_attn_chpop_align_16_v3.0_dropout_early_stopping.best',load_checkpoint=False)

    plot_weight(model,np.array([71,1,73,1,74,1,69,1,67,1,1,1,66,1,1,1,
                          71,1,73,1,74,1,69,1,67,1,1,1,66,1,1,1]
                          ),target_pos=-4)
    plot_weight(model,np.array([i+12 if i>1 else i for i in [57,1,59,1,57,1,55,1,54,1,52,1,50,1,1,1,
                          55,1,57,1,55,1,54,1,52,1,50,1,49,1,1,1]]
                          ),target_pos=-4)
    plot_weight(model,np.array([62,1,64,1,66,1,67,1,69,1,66,1,62,1,57,1,
                                64,1,66,1,68,1,69,1,71,1,68,1,64,1,59,1]
                          ),target_pos=-2)
    exit(0)
    plot_weight(model,np.array([60,1,64,1,67,1,64,1,72,1,67,1,64,1,67,1,
                          59,1,62,1,67,1,62,1,71,1,24,1,22,1,27,1,
                          57,1,60,1,64,1,60,1,69,1,64,1,60,1,64,1,
                          55,1,59,1,62,1,59,1,67,1,62,1,59,1,62,1,]
                          ))
    plot_weight(model,np.array([i+37 if i>1 else i for i in
                         [20,1,22,1,24,1,25,1,27,1,29,1,31,1,32,1,
                          32,1,31,1,29,1,27,1,25,1,24,1,22,1,27,1,
                          21,1,23,1,25,1,26,1,28,1,30,1,32,1,33,1,
                          33,1,32,1,30,1,28,1,26,1,25,1,23,1,21,1,]
                          ]))
    plot_weight(model,np.array([64,1,65,1,67,1,20,1,27,1, 1,1, 1,1, 1,1,
                          17,1,19,1,20,1,17,1,24,1, 1,1, 1,1, 1,1,
                          15,1,17,1,19,1,15,1,22,1, 1,1, 1,1, 1,1,
                          13,1,15,1,17,1,13,1,20,1, 1,1, 1,1, 1,1,
                          12,1,13,1,15,1,12,1,10,1, 1,1, 1,1, 1,1,]))
    plot_weight(model,np.array([i+40 if i>1 else i for i in
                         [20,1,22,1,24,1,20,1,27,1, 1,1, 1,1, 1,1,
                          17,1,19,1,20,1,17,1,24,1, 1,1, 1,1, 1,1,
                          15,1,17,1,19,1,15,1,22,1, 1,1, 1,1, 1,1,
                          13,1,15,1,17,1,13,1,20,1, 1,1, 1,1, 1,1,
                          12,1,13,1,15,1,12,1,10,1, 1,1, 1,1, 1,1,]
                          ]))
    plot_weight(model,np.array([i+37 if i>1 else i for i in
                         [17,1,17,1,20,1,17,1,20,1,22,1,17,1,24,1,
                          15,1,15,1,19,1,15,1,19,1,20,1,15,1,22,1,
                          13,1,13,1,17,1,13,1,17,1,19,1,13,1,20,1,
                          12,1,12,1,15,1,12,1,15,1,17,1,19,1,20,1,]
                          ]))
    evaluate_all(model,get_dataset_split('chpop','test',False,256))