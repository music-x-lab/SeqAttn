import numpy as np
from mir.nn.data_storage import FramedRAMDataStorage
from mir.nn.data_provider import FramedDataProvider
from custom_pitch_shifter import CustomChordPitchShifter,CustomPitchShifter

MAX_TEST_LENGTH=1024


def get_dataset_split(dataset_name,split,use_cond,fix_length=-1,verbose=1):
    import os
    storage_x=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/%s_note_chords'%dataset_name))
    storage_x.load()
    f=open('./data/%s_note_chords.split.txt'%dataset_name,'r')
    tokens=[line.strip().split(',') for line in f.readlines() if line.strip()!='']
    test_indices=[int(id) for id in tokens[['train','val','test'].index(split)]]
    if(verbose>0):
        print('Using %d samples to test'%len(test_indices))
    test_provider=FramedDataProvider(train_sample_length=-1,shift_low=0,shift_high=0,
                                      num_workers=0,allow_truncate=True,average_samples_per_song=1)
    test_provider.link(storage_x,CustomPitchShifter(fixed_length=fix_length),subrange=test_indices)
    if(use_cond):
        test_provider.link(storage_x,CustomChordPitchShifter(fixed_length=fix_length),subrange=test_indices)

    return test_provider

def evaluate_sample(model,sample,id,verbose=1):
    if(len(sample)==1):
        tokens,=sample
        tokens=tokens[:MAX_TEST_LENGTH]
        pred=model.inference(tokens)
    else:
        tokens,cond=sample
        tokens=tokens[:MAX_TEST_LENGTH]
        cond=cond[:MAX_TEST_LENGTH]
        pred=model.inference(tokens,cond)
    if(isinstance(pred,tuple)):
        pred,_=pred
    pred_max=np.argmax(pred,axis=1)
    accuracy=np.sum(pred_max==tokens)/len(tokens)
    prob=pred[np.arange(len(tokens)),tokens]
    perplexity=np.exp(-np.mean(np.log(prob)))
    if(verbose>0):
        print('%d: acc=%.4f, perplexity=%.4f'%(id,accuracy,perplexity))
    return accuracy,perplexity


def evaluate_all(model,data_set,verbose=1):
    result=[]
    for i in range(data_set.get_length()):
        result.append(evaluate_sample(model,data_set.get_sample(i),i,verbose=verbose))
    mean_accuracy=np.mean([item[0] for item in result])
    mean_perplexity=np.mean([item[1] for item in result])
    print('-'*45)
    print('Model: %s'%model.save_name)
    print('Mean: acc=%.4f, perplexity=%.4f'%(mean_accuracy,mean_perplexity),flush=True)

def evaluate_sample_most_frequent(sample):
    tokens,=sample
    tokens=tokens[:MAX_TEST_LENGTH]
    accuracy=np.sum(tokens==1)/len(tokens)
    return accuracy

def evaluate_all_most_frequent(data_set):
    result=[]
    for i in range(data_set.get_length()):
        result.append(evaluate_sample_most_frequent(data_set.get_sample(i)))
    mean_accuracy=np.mean([item for item in result])
    print('-'*45)
    print('Most frequent token')
    print('Mean: acc=%.4f'%mean_accuracy,flush=True)

