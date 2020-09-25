import torch
import torch.nn as nn

def random_attention_dropout(weight,p,keep_dim):
    '''
    Create a random attention mask
    :param weight: attention weight matrix
    :param p: probability to perform dropout
    :param keep_dim: integer or None, the dimension along which the attention will be summed
    :return: the mask
    '''
    mask=torch.zeros_like(weight,requires_grad=False).uniform_()>p
    if(keep_dim is not None):
        mask_sum=(~mask).min(keep_dim,keepdim=True).values
        mask=(mask|mask_sum)
    return mask

if __name__ == '__main__':
    weight=torch.zeros(5,3,6,requires_grad=True)
    print(random_attention_dropout(weight,0.9,1))


