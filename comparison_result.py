from evaluation_metrics import evaluate_all,get_dataset_split,evaluate_all_most_frequent
from custom_pitch_shifter import N_MIDI_PITCH
from mir.nn.train import NetworkInterface
from seq_attention_bidirectional_model import ConditionalSequentialAttentionPredictor
from seq_attention_model import SequentialAttentionPredictorV2
from transformer_decoder_model import TransformerModel
from transformer_encoder_decoder_model import TransformerEncoderDecoderModel

def get_all_models():
    # seq attn
    yield NetworkInterface(SequentialAttentionPredictorV2(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=4,dropout=0.5),
        'seq_attn_nottingham_align_4_v3.0_dropout_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(SequentialAttentionPredictorV2(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=4,dropout=0.5),
        'seq_attn_chpop_align_4_v3.0_dropout_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(SequentialAttentionPredictorV2(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=16,dropout=0.5),
        'seq_attn_chpop_align_16_v3.0_dropout_early_stopping.best',load_checkpoint=False)

    # transformer
    yield NetworkInterface(TransformerModel(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,dropout=0.5),
        'transformer_nottingham_v1.0_relative_pe_3_layers_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(TransformerModel(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,dropout=0.5),
        'transformer_chpop_v1.0_relative_pe_3_layers_early_stopping.best',load_checkpoint=False)

    # cond seq attn
    yield NetworkInterface(ConditionalSequentialAttentionPredictor(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,cond_size=128,
        input_cond_shape=36,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=4,dropout=0.5),
        'cond_seq_attn_nottingham_align_4_v3.0_dropout_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(ConditionalSequentialAttentionPredictor(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,cond_size=128,
        input_cond_shape=36,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=4,dropout=0.5),
        'cond_seq_attn_chpop_align_4_v3.0_dropout_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(ConditionalSequentialAttentionPredictor(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,cond_size=128,
        input_cond_shape=36,hidden_dim=256,n_head=4,n_rel_pos=32,tokens_per_bar=16,dropout=0.5),
        'cond_seq_attn_chpop_align_16_v3.0_dropout_early_stopping.best',load_checkpoint=False)

    # transformer with condition
    yield NetworkInterface(TransformerEncoderDecoderModel(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,input_cond_shape=36,dropout=0.5),
        'cond_transformer_nottingham_v1.0_relative_pe_3_layers_early_stopping.best',load_checkpoint=False)
    yield NetworkInterface(TransformerEncoderDecoderModel(
        n_vocabulary=N_MIDI_PITCH+2,emb_size=256,dim_feed_forward=1024,n_head=4,n_layers=3,input_cond_shape=36,dropout=0.5),
        'cond_transformer_chpop_v1.0_relative_pe_3_layers_early_stopping.best',load_checkpoint=False)
    return models


if __name__ == '__main__':
    models=get_all_models()
    for dataset_name in ['nottingham','chpop']:
        print(dataset_name)
        evaluate_all_most_frequent(get_dataset_split(dataset_name,'test',False,verbose=0))
    for model in models:
        dataset_name='nottingham' if 'nottingham' in model.save_name else \
                     'chpop' if 'chpop' in model.save_name else '?'
        use_cond=model.save_name.startswith('cond_')
        evaluate_all(model,get_dataset_split(dataset_name,'test',use_cond,verbose=0),verbose=0)
        del model