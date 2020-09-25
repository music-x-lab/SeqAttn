from mir.nn.data_decorator import AbstractPitchShifter
import numpy as np
N_MIDI_PITCH=128

class CustomPitchShifter(AbstractPitchShifter):

    def __init__(self,fixed_length=-1):
        self.fixed_length=fixed_length

    def pitch_shift(self,data,shift):
        notes=data[:,0].copy()
        is_onset=notes>=2
        onsets=notes[is_onset]-2+shift
        onsets[onsets<0]=0
        onsets[onsets>=N_MIDI_PITCH]=N_MIDI_PITCH-1
        notes[is_onset]=onsets+2
        if(self.fixed_length!=-1):
            if(len(notes)<self.fixed_length):
                notes=np.concatenate((notes,np.zeros(self.fixed_length-len(notes),dtype=notes.dtype)))
            elif(len(notes)>self.fixed_length):
                notes=notes[:self.fixed_length]
        return notes


class CustomChordPitchShifter(AbstractPitchShifter):

    def __init__(self,fixed_length=-1):
        self.fixed_length=fixed_length

    def pitch_shift(self,data,shift):
        def make_one_hot(arr,chord_index):
            result=np.zeros((len(arr),12))
            result[chord_index,arr[chord_index]]=1.
            return result
        root=data[:,1].copy()
        chroma=data[:,2:14].copy()
        bass=data[:,14].copy()
        chord_index=root>=0
        root[chord_index]=(root[chord_index]+shift+12)%12
        chroma[chord_index,:]=np.roll(chroma[chord_index,:],shift,axis=1)
        bass[chord_index]=(bass[chord_index]+shift+12)%12
        result=np.concatenate(
            (make_one_hot(root,chord_index),
             chroma,
             make_one_hot(bass,chord_index)),axis=1)

        if(self.fixed_length!=-1):
            if(len(result)<self.fixed_length):
                result=np.concatenate((result,np.zeros((self.fixed_length-len(result),result.shape[1]),dtype=result.dtype)),
                                     axis=0)
            elif(len(result)>self.fixed_length):
                result=result[:self.fixed_length]
        return result