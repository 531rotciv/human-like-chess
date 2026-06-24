import json

with open(
    "../data/all_moves.json",
    "r"
) as f:
    all_moves = json.load(f)

move_to_id = {
    move: idx
    for idx, move in enumerate(all_moves)
}

id_to_move = {
    idx: move
    for move, idx in move_to_id.items()
}