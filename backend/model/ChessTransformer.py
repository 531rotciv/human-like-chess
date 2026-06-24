import torch.nn as nn
import torch
class ChessTransformer(nn.Module):

    def __init__(
        self,
        vocab_size,
        num_moves,
        seq_len,
        d_model=128,
        n_heads=8,
        n_layers=4,
        dropout=0.1
    ):
        super().__init__()

        self.token_embedding = nn.Embedding(
            vocab_size,
            d_model
        )

        self.position_embedding = nn.Parameter(
            torch.randn(
                1,
                seq_len,
                d_model
            )
        )

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dropout=dropout,
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=n_layers
        )

        self.classifier = nn.Linear(
            d_model,
            num_moves
        )

    def forward(self, x):

        x = self.token_embedding(x)

        x = x + self.position_embedding

        x = self.transformer(x)

        x = x.mean(dim=1)

        logits = self.classifier(x)

        return logits