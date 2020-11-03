import numpy as np
import pretty_midi
from mir import DataEntry
from mir.extractors.misc import FrameCount
from mir.io import SpectrogramIO
from mir.nn.data_storage import FramedRAMDataStorage
import mir_eval.chord
import os
from matplotlib import pyplot as plt
QUALITIES = {
    #           1     2     3     4  5     6     7
    'maj':     [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    'min':     [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    'aug':     [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    'aug(b7)': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    'dim':     [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    'sus4':    [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    'sus2':    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    '7':       [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'maj7':    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    'min7':    [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    'minmaj7': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    'maj6':    [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    'min6':    [1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
    'dim7':    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    'hdim7':   [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
    'maj9':    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    'min9':    [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    '(9)':     [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    '9':       [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'b9':      [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    '#9':      [1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0],
    'min11':   [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    '11':      [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    '#11':     [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'maj13':   [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    'min13':   [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    '13':      [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'b13':     [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    '1':       [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '5':       [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    '':        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}

NUM_TO_ABS_SCALE=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']


NOTTINGHAM_MIDI_PATH=R'D:\Dataset\nottingham\MIDI'
POP909_DATASET_PATH=R'D:\Dataset\POP909'

def estimate_root(chroma,bass):
    if(np.all(chroma==0)):
        return -1
    for i in range(bass,bass+12):
        for quality in QUALITIES:
            template=QUALITIES[quality]
            if(np.all(np.roll(template,i)-chroma==0)):
                if(i%12!=bass%12):
                    print('%s:%s/%s'%(NUM_TO_ABS_SCALE[i%12],quality,NUM_TO_ABS_SCALE[bass%12]))
                else:
                    print('%s:%s'%(NUM_TO_ABS_SCALE[i%12],quality))

                return i%12
    raise Exception('Bad chord:',chroma)

def get_keypoints(beat,units_per_beat):
    # split beat into several units
    keypoints=np.linspace(beat[:-1],beat[1:],units_per_beat+1).T
    return np.append(keypoints[:,:-1].reshape((-1)),keypoints[-1,-1])

def get_quantization_boundary(keypoints,percentage=0.5):
    return keypoints[:-1]*(1-percentage)+keypoints[1:]*percentage

def process_nottingham_entry(melody_file,chord_file):
    '''
    Process a single nottingham song file
    :param melody_file: the MIDI melody file
    :param chord_file: the MIID chord file
    :return:
    a matrix with shape [T, D]. T is the number of frames (one frame is a sixteenth note).
    The second dimension is a concatenation of the following:
    * 1-D notes: range 0-129. 0 for silence, 1 for sustain, 2-129 for onsets with 128 MIDI pitches.
    * 1-D root: range 0-11, or -1. the chord root. -1 for non-chord.
    * 12-D chroma: boolean. the pitch class of the chord.
    * 1-D bass: range 0-11, or -1. the chord bass note. -1 for non-chord. In the nottingham dataset, we use the root note as the bass note.
    * 1-D beat: boolean. Whether this frame is a beat frame
    * 1-D downbeat: boolean. Whether this frame is a downbeat frame
    '''
    melody_midi=pretty_midi.PrettyMIDI(melody_file,initial_tempo=120.)
    chord_midi=pretty_midi.PrettyMIDI(chord_file,initial_tempo=120.)
    assert(chord_midi.time_signature_changes[0].numerator==melody_midi.time_signature_changes[0].numerator)
    assert(chord_midi.time_signature_changes[0].denominator==melody_midi.time_signature_changes[0].denominator)
    # there are some bugs in pretty midi to deal with non 4/4 songs, the following code changes the midi files to
    # get the correct beats and downbeats
    ratio=(melody_midi.get_downbeats()[1]-melody_midi.get_downbeats()[0])/\
          (120./60.*melody_midi.time_signature_changes[0].numerator/melody_midi.time_signature_changes[0].denominator)
    for ins in melody_midi.instruments:
        for note in ins.notes:
            note.start*=ratio
            note.end*=ratio
    for ins in chord_midi.instruments:
        for note in ins.notes:
            note.start*=ratio
            note.end*=ratio
    beats=melody_midi.get_beats()
    downbeats=melody_midi.get_downbeats()
    keypoints=get_keypoints(beats,16//melody_midi.time_signature_changes[0].denominator)
    boundary=get_quantization_boundary(keypoints)

    # calculate the quantized chords and melody
    chroma=np.zeros((len(keypoints)-1,12),dtype=np.int)
    bass=np.zeros((len(keypoints)-1,),dtype=np.int)
    root=np.zeros((len(keypoints)-1,),dtype=np.int)
    bass[:]=129
    notes=np.zeros((len(keypoints)-1,),dtype=np.int)
    is_beat=np.zeros((len(keypoints)-1,))
    is_downbeat=np.zeros((len(keypoints)-1,))
    # print(beats,downbeats)
    def quantize(time):
        return np.searchsorted(boundary,time)
    for ins in melody_midi.instruments:
        for note in ins.notes:
            start=quantize(note.start)
            end=quantize(note.end)
            notes[start:end]=1 # sustain
            notes[start:start+1]=2+note.pitch
    for ins in chord_midi.instruments:
        for note in ins.notes:
            start=quantize(note.start)
            end=quantize(note.end)
            # the bass is the lowest note
            bass[start:end]=np.minimum(bass[start:end],note.pitch)
            chroma[start:end,note.pitch%12]=1
    bass[bass==129]=-1
    for time in beats:
        pos=quantize(time)
        is_beat[pos:pos+1]=1
    for time in downbeats:
        pos=quantize(time)
        is_downbeat[pos:pos+1]=1
    for i in range(len(keypoints)-1):
        if(i>=1 and np.all(chroma[i]==chroma[i-1])):
            root[i]=root[i-1]
            bass[i]=bass[i-1]
        else:
            # print(i,len(keypoints),bass[i])
            if(bass[i]>=0):
                bass[i]%=12
            # we do not need to estimate the root since the root is the same as the bass here
            # root[i]=estimate_root(chroma[i],bass[i])
            root[i]=bass[i]
    # print(melody_midi.time_signature_changes[0].numerator,melody_midi.time_signature_changes[0].denominator,ratio)
    # print(notes,is_beat)
    return np.stack([
        notes,
        root,
        *chroma.T,
        bass,
        is_beat,
        is_downbeat,
    ],axis=1)

def process_nottingham_dataset():
    melody_path=os.path.join(NOTTINGHAM_MIDI_PATH,'melody')
    chord_path=os.path.join(NOTTINGHAM_MIDI_PATH,'chords')
    entries=[]
    for file in os.listdir(chord_path):
        print('Processing',file)
        result=process_nottingham_entry(os.path.join(melody_path,file),os.path.join(chord_path,file))
        print(result.shape)
        entry=DataEntry()
        entry.append_data(result,SpectrogramIO,'result')
        entry.append_extractor(FrameCount,'n_frame',source='result')
        entries.append(entry)
    storage=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/nottingham_note_chords'),dtype=np.int8)
    storage.delete()
    storage.create_and_cache(entries,'result')
    train_test_split(len(entries),'data/nottingham_note_chords.split.txt')

def process_air(data):
    data=data.reshape((-16,data.shape[1]//16))
    notes=np.zeros(data.shape[0],dtype=np.int)
    p=0
    pitch=data[:,p].astype(np.int32);p+=1
    onset=data[:,p].astype(np.int32);p+=1
    non_chord_pos=data[:,p]<0
    chord_root=data[:,p].astype(np.int32)%12;p+=1
    chord_map=data[:,p:p+12];p+=12
    chord_bass=(data[:,p].astype(np.int32)+chord_root)%12;p+=1
    bar_pos=data[:,p].astype(np.int32);p+=1
    beat_pos=data[:,p].astype(np.int32);p+=1
    chord_root[non_chord_pos]=-1
    chord_bass[non_chord_pos]=-1
    notes[pitch>=0]=1
    notes[onset>=1]=pitch[onset>=1]+2
    print(notes)
    return np.stack([
        notes,
        chord_root,
        *chord_map.T,
        chord_bass,
        beat_pos==0,
        bar_pos==0,
    ],axis=1)

def process_cb_dataset():
    storage=FramedRAMDataStorage('cb_gen_v2')
    storage.load()
    entries=[]
    print(storage.total_song_count)
    exit(0)
    for i in range(storage.total_song_count):
        data=storage.locate(i,0,storage.length[i])
        result=process_air(data)
        entry=DataEntry()
        entry.append_data(result,SpectrogramIO,'result')
        entry.append_extractor(FrameCount,'n_frame',source='result')
        entries.append(entry)
    storage=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/chpop_note_chords'),dtype=np.int8)
    storage.delete()
    storage.create_and_cache(entries,'result')
    train_test_split(len(entries),'data/chpop_note_chords.split.txt')

def process_pop909_entry(midi_path,debug):
    folder=os.path.dirname(midi_path)
    midi=pretty_midi.PrettyMIDI(midi_path)
    f=open(os.path.join(folder,'beat_midi.txt'),'r')
    beat_lines=[line.strip().split(' ') for line in f.readlines() if line.strip()!='']
    f.close()
    f=open(os.path.join(folder,'chord_midi.txt'),'r')
    chord_lines=[line.strip().split('\t') for line in f.readlines() if line.strip()!='']
    f.close()
    beat_time=[float(line[0]) for line in beat_lines]
    keypoints=get_keypoints(beat_time,4)
    boundary=get_quantization_boundary(keypoints)
    def quantize(time):
        return np.searchsorted(boundary,time)
    result_melody=np.zeros((len(keypoints),128))
    result_acc=np.zeros((len(keypoints),128))
    chord_root=np.full(len(keypoints),-1)
    chord_map=np.zeros((len(keypoints),12))
    chord_bass=np.full(len(keypoints),-1)
    is_beat=np.zeros(len(keypoints))
    is_downbeat=np.zeros(len(keypoints))
    for ins in midi.instruments:
        assert(ins.name in ['MELODY','BRIDGE','PIANO'])
        for note in ins.notes:
            start=quantize(note.start)
            end=quantize(note.end)
            length=max(1,end-start)
            if(ins.name=='MELODY'):
                result_melody[start:start+1,note.pitch]=length
            else:
                result_acc[start:start+1,note.pitch]=length
    for line in chord_lines:
        start=quantize(float(line[0]))
        end=quantize(float(line[1]))
        chord_label=line[2]
        root,chroma,bass=mir_eval.chord.encode(chord_label)
        if(root>=0):
            chord_map[start:end]=mir_eval.chord.rotate_bitmap_to_root(chroma,root)
            bass=(bass+root)%12
        chord_root[start:end]=root
        chord_bass[start:end]=bass
    for line in beat_lines:
        pos=quantize(float(line[0]))
        is_beat[pos]=True
        is_downbeat[pos]=float(line[2])>0
    result=np.stack([
        *result_melody.T,
        *result_acc.T,
        chord_root,
        *chord_map.T,
        chord_bass,
        is_beat,
        is_downbeat,
    ],axis=1)
    if(debug):
        plt.imshow(result[:400].T>0)
        plt.gca().invert_yaxis()
        plt.show()
    return result

def process_poly_pop909_dataset():
    entries=[]
    folders=os.listdir(POP909_DATASET_PATH)
    for folder in folders:
        folder_path=os.path.join(POP909_DATASET_PATH,folder)
        if(os.path.isdir(folder_path)):
            print('Processing',folder)
            result=process_pop909_entry(os.path.join(folder_path,folder+'.mid'),debug=False)
            entry=DataEntry()
            entry.append_data(result,SpectrogramIO,'result')
            entry.append_extractor(FrameCount,'n_frame',source='result')
            entries.append(entry)
    storage=FramedRAMDataStorage(os.path.join(os.getcwd(),'data/pop909_mel_acc_chords'),dtype=np.int16)
    storage.delete()
    storage.create_and_cache(entries,'result')
    train_test_split(len(entries),'data/pop909_mel_acc_chords.split.txt')

def train_test_split(count,filename):
    ratio=10
    shuffled=np.arange(count)
    np.random.seed(6172)
    np.random.shuffle(shuffled)
    result_test=np.arange(ratio-1,count,ratio)
    result_val=np.arange(ratio-2,count,ratio)
    result_train=np.setdiff1d(np.setdiff1d(np.arange(count),result_test),result_val)
    f=open(filename,'w')
    for array in [result_train,result_val,result_test]:
        f.write('%s\n'%(','.join([str(shuffled[i]) for i in array])))
    f.close()

if __name__ == '__main__':
    process_nottingham_dataset()
