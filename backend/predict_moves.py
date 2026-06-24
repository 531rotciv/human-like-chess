import torch
import chess
from move_vocab import move_to_id
def board_to_tokens(fen):

    board = chess.Board(fen)

    tokens = []

    for square in chess.SQUARES:

        piece = board.piece_at(square)
    
        if piece is None:
            tokens.append(0)

        else:

            offset = 0 if piece.color == chess.WHITE else 6

            tokens.append(
                piece.piece_type + offset
            )

    tokens.extend([
        13 if board.turn == chess.WHITE else 14,
    
        15 if board.has_kingside_castling_rights(chess.WHITE) else 16,
        17 if board.has_queenside_castling_rights(chess.WHITE) else 18,
    
        19 if board.has_kingside_castling_rights(chess.BLACK) else 20,
        21 if board.has_queenside_castling_rights(chess.BLACK) else 22
    ])

    return tokens

def predict_moves(
    board,
    model,
    device,
    top_k=10,
    temperature=0.8
):

    tokens = board_to_tokens(
        board.fen()
    )

    x = torch.tensor(
        tokens,
        dtype=torch.long
    ).unsqueeze(0).to(device)

    model.eval()

    with torch.no_grad():

        logits = model(x)

        legal_mask = torch.zeros(
            logits.shape[1],
            dtype=torch.bool,
            device=device
        )

        for move in board.legal_moves:

            move_id = move_to_id.get(
                move.uci()
            )

            if move_id is not None:
                legal_mask[move_id] = True

        if not legal_mask.any():

            raise RuntimeError(
                "No legal moves found in vocabulary."
            )

        logits[0, ~legal_mask] = float("-inf")

        probs = torch.softmax(
            logits / temperature,
            dim=1
        )[0]

        top_probs, top_ids = torch.topk(
            probs,
            k=min(
                top_k,
                legal_mask.sum().item()
            )
        )

    return top_probs, top_ids