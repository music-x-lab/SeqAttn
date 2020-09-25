import numpy as np
import pretty_midi
import os

def mkdir_for_file(path):
    folder_path=os.path.dirname(path)
    if(not os.path.isdir(folder_path)):
        os.makedirs(folder_path)
    return path

def export_midi(file_path,*args):
    midi=pretty_midi.PrettyMIDI()
    piano_program=pretty_midi.instrument_name_to_program('Acoustic Grand Piano')
    for midilab in args:
        piano=pretty_midi.Instrument(program=piano_program)
        for note in midilab:
            assert(note[1]>note[0]+1e-6)
            midi_note=pretty_midi.Note(velocity=100,pitch=note[2],start=note[0],end=note[1])
            piano.notes.append(midi_note)
        midi.instruments.append(piano)
    mkdir_for_file(file_path)
    midi.write(file_path)