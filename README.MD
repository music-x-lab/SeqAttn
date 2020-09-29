# Sequential Attention (SeqAttn)

The official repo for the paper **Discovering Music Relations with Sequential Attention**.

## Pre-trained Models

You can get all the pre-trained models in the paper here:

https://drive.google.com/drive/folders/1FydcZKpzvvpjMaY5DOCL5k3P_1I78MdC?usp=sharing

After downloading, put the ".sdict" files in the "cache_data" folder.

## Running Training

We have included the processed nottingham dataset in the data folder. If you need the chpop dataset, please contact us.

You can re-train the models with the following example code:

```
seq_attention_model.py nottingham 4
seq_attention_bidirectional_model.py nottingham 4
```

## Model Evaluation

See ``comparison_result.py`` for details.

## Model Generation

You can run generation using pre-trained models with the example code below:

```
seq_attention_bidirectional_model_generation.py nottingham 4 1.0
seq_attention_bidirectional_model_generation.py chpop 4 1.0
seq_attention_bidirectional_model_generation.py chpop 16 1.0
```
