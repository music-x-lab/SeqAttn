import numpy as np
from music_base import MIDI_BASE,VALID_MIDI_COUNT

CHORD_BASS_START=36+7-12
CHORD_MAIN_START=36+7

def token_to_midilab(tokens,bpm=120,tokens_per_beat=4):
    last_pitch=-1
    last_onset=-1
    result=[]
    n_frame=len(tokens)
    for i in range(n_frame):
        current_token=tokens[i].astype(np.int)
        if(current_token==0 or current_token>1):
            if(last_pitch>=0):
                result.append([last_onset,i-1,last_pitch+MIDI_BASE])
            if(current_token>1):
                last_onset=i
                last_pitch=current_token-2
            else:
                last_pitch=-1
    interval=60/(bpm*tokens_per_beat)
    if(last_pitch>=0):
        result.append([last_onset,n_frame-1,last_pitch+MIDI_BASE])
    return [[interval*x[0],interval*(x[1]+1)-1e-3,x[2]] for x in result]


def triple_chroma_to_midilab(triple_chroma,bpm=120,tokens_per_beat=4,beat_per_bar=4,downbeat=None):
    last_chord_onset=-1
    last_chord_notes=[]
    result=[]
    for i in range(len(triple_chroma)+1):
        if(i==len(triple_chroma) or (beat_per_bar>0 and i%(tokens_per_beat*beat_per_bar)==0) or
                i==0 or not np.allclose(triple_chroma[i],triple_chroma[i-1]) or (downbeat is not None and downbeat[i])):
            if(last_chord_onset>=0):
                result+=[[last_chord_onset,i-1,note] for note in last_chord_notes]
                last_chord_onset=-1
            if(i<len(triple_chroma)):
                def abs_chord_array_to_midi_notes(bass,abs_map):
                    if(bass<0):
                        return []
                    result=[(bass-CHORD_BASS_START)%12+CHORD_BASS_START]
                    for i in range(0,12):
                        if(abs_map[i]>0):
                            result.append((i-CHORD_MAIN_START)%12+CHORD_MAIN_START)
                    return result
                _,chroma,bass=triple_chroma[i,:12],triple_chroma[i,12:-12],triple_chroma[i,-12:]
                last_chord_notes=abs_chord_array_to_midi_notes(np.arange(12)[bass.astype(np.bool)][0] if np.any(bass) else -1,
                                                               chroma.astype(np.bool))
                last_chord_onset=i
    interval=60/(bpm*tokens_per_beat)
    return [[interval*x[0],interval*(x[1]+1)-1e-3,x[2]] for x in result]
