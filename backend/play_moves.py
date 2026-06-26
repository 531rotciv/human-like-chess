import chess
from predict_moves import predict_moves
import torch
import time
from move_vocab import id_to_move



def play_moves(
    model,
    board_fen,
    device
):
    board = chess.Board(
        board_fen
    )

    TOP_K = 10

    move_number = board.fullmove_number 
    TEMPERATURE = max(
        0.5,
        1.5 * (0.9 ** move_number)
    )

    print("\nModel thinking...")
    time.sleep(1)
    if board.is_game_over():
        if board.is_checkmate():
            termination = "checkmate"

        elif board.is_stalemate():
            termination = "stalemate"

        elif board.is_insufficient_material():
            termination = "insufficient_material"

        elif board.is_fifty_moves():
            termination = "fifty_move_rule"
        return {
            "move": None,
            "result": board.result(),
            "termination": termination
        }

    top_probs, top_ids = predict_moves(
        board,
        model,
        device,
        top_k=TOP_K,
        temperature=TEMPERATURE
    )

    print("\nTop candidates:")
    print(
        f"The Temperature is: "
        f"{TEMPERATURE}"
    )

    for prob, move_id in zip(
        top_probs,
        top_ids
    ):
        print(
            f"{id_to_move[move_id.item()]:6} "
            f"{prob.item():.3f}"
        )

    probs = (
        top_probs
        / top_probs.sum()
    )

    choice = torch.multinomial(
        probs,
        1
    ).item()

    move_id = top_ids[
        choice
    ].item()

    model_move = id_to_move[
        move_id
    ]

    print(
        f"Model plays: "
        f"{model_move}"
    )


    result = board.result()

    termination = None

    if board.is_checkmate():
        termination = "checkmate"

    elif board.is_stalemate():
        termination = "stalemate"

    elif board.is_insufficient_material():
        termination = "insufficient_material"

    elif board.is_fifty_moves():
        termination = "fifty_move_rule"



    return model_move, result, termination