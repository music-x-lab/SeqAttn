import numpy as np
from seq_attention_bidirectional_model import NetworkInterface,CustomPitchShifter,\
    ConditionalSequentialAttentionPredictor,CustomChordPitchShifter,FramedRAMDataStorage,\
    FramedDataProvider,N_MIDI_PITCH
import matplotlib.pyplot as plt
from array_to_midi import triple_chroma_to_midilab
from extractors.midilab_exporter import export_midi
from evaluation_metrics import get_dataset_split
import sys

def token_to_midilab(tokens,bpm=120,tokens_per_beat=4):
    last_pitch=-1
    last_onset=-1
    result=[]
    n_frame=len(tokens)
    for i in range(n_frame):
        current_token=tokens[i].astype(np.int)
        if(current_token==0 or current_token>1):
            if(last_pitch>=0):
                result.append([last_onset,i-1,last_pitch])
            if(current_token>1):
                last_onset=i
                last_pitch=current_token-2
            else:
                last_pitch=-1
    interval=60/(bpm*tokens_per_beat)
    if(last_pitch>=0):
        result.append([last_onset,n_frame-1,last_pitch])
    return [[interval*x[0],interval*(x[1]+1)-1e-3,x[2]] for x in result]


def recover_attention_matrix(raw_attn,tokens_per_bar):
    group_count,seq_length=raw_attn.shape
    result=np.zeros((seq_length,seq_length+1))
    for i in range(seq_length):
        bar_id=i//tokens_per_bar
        bar_position=i%tokens_per_bar
        result[i,0]=raw_attn[bar_id:,i].sum()
        if(bar_id>0):
            result[i,bar_position:bar_id*tokens_per_bar:tokens_per_bar]=raw_attn[bar_id-1::-1,i]
    return result

def plot_weight(net,tokens,condition):
    result,attn=net.inference(tokens,condition)
    generation_one_hot=np.eye(result.shape[1])[generation]
    tokens_one_hot=np.eye(result.shape[1])[tokens]
    fig, ax = plt.subplots(nrows=3, ncols=1, sharex='all')
    ax[0].imshow(result.T, interpolation='nearest', aspect='auto')
    ax[0].invert_yaxis()
    ax[1].imshow(generation_one_hot.T, interpolation='nearest', aspect='auto')
    ax[1].invert_yaxis()
    ax[2].imshow(tokens_one_hot.T, interpolation='nearest', aspect='auto')
    ax[2].invert_yaxis()
    plt.show()

def conditional_generation(net,tokens,condition,beat,id,temperature=np.inf):
    midilab_chord=triple_chroma_to_midilab(condition,beat_per_bar=0,downbeat=beat[:,1])
    seg_count=16
    for i in [16,8,1,0]:
        print('Generating id=%d, i=%d, temperature=%f'%(id,i,temperature))
        cond_length=(len(tokens)*i)//seg_count
        generate_length=len(tokens)-cond_length
        def length_to_text(length):
            if(length%net.net.tokens_per_bar==0):
                return '%dbars'%(length//net.net.tokens_per_bar)
            else:
                return '%dtokens'%length
        generation=net.inference_function('conditional_generation',tokens[:cond_length],condition,temperature=temperature)
        filename='output/conditional_generation/%s/temperature_%f/%d_given_%s_generate_%s.mid'%(net.save_name,temperature,id,
                                                                           length_to_text(cond_length),
                                                                           length_to_text(generate_length))
        midilab_generation=token_to_midilab(generation)
        export_midi(filename,midilab_generation,midilab_chord)


if __name__ == '__main__':
    dataset_name=sys.argv[1]
    tokens_per_bar=int(sys.argv[2])
    temperature=float(sys.argv[3])
    if(temperature==0.0):
        temperature=np.inf
    net=NetworkInterface(ConditionalSequentialAttentionPredictor(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,cond_size=128,
        input_cond_shape=36,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=tokens_per_bar,dropout=0.5),
        'cond_seq_attn_%s_align_%d_v3.0_dropout_early_stopping.best'%(dataset_name,tokens_per_bar),load_checkpoint=False)
    test_provider=get_dataset_split(dataset_name,'test',True,256,use_beat=True)
    for i in range(test_provider.get_length()):
        conditional_generation(net,*test_provider.get_sample(i),i,temperature=temperature)
        # plot_weight(net,*val_provider.get_sample(i),i)


