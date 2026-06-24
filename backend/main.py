import requests
import io
import chess
import chess.pgn
from fastapi import FastAPI, HTTPException
from schemas.MoveRequest import MoveRequest
from schemas.SkillSelectionRequest import SkillSelectionRequest
import torch
import torch.nn as nn
import json
from  model.ChessTransformer import ChessTransformer
from pathlib import Path
from play_moves import play_moves
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
CONFIG_ROOT = BASE_DIR.parent

config_path = CONFIG_ROOT / "configurations" / "model_configs.json"

with open(config_path, "r") as f:
    config = json.load(f)

model_paths = config["model_paths"]

current_model = None
current_skill = None


device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


def load_model(path):
    state = torch.load(
        path,
        map_location=device
    )
    if isinstance(state, dict) and "classifier.weight" in state:
        num_moves = state["classifier.weight"].size(0)
    else:
        num_moves = config["num_moves"]

    new_model = ChessTransformer(
        vocab_size=config["vocab_size"],
        num_moves=config["num_moves"],
        seq_len=config["seq_len"]
    )
    new_model.load_state_dict(state)
    new_model.to(device)
    new_model.eval()
    return new_model


@app.post("/api/select-skill")
def select_skill(request: SkillSelectionRequest):
    global current_model, current_skill
    print("/api/select-skill called with:", request)
    print("Configured model_paths keys:", list(model_paths.keys()))
    try:
        ai_skill = str(request.ai_skill)
        if ai_skill not in model_paths:
            raise HTTPException(status_code=400, detail={"error": "Unsupported ai_skill", "supported": list(model_paths.keys())})

        model_path = model_paths[ai_skill]
        print("Configured model_path value:", model_path)
        if model_path is None:
            raise HTTPException(status_code=500, detail="model path is not configured for this skill")

        if not Path(model_path).is_absolute():
            model_path = str(CONFIG_ROOT / model_path)

        print("Resolved model_path ->", model_path)

        if not Path(model_path).exists():
            raise HTTPException(status_code=404, detail=f"model file not found: {model_path}")

        current_model = load_model(model_path)
        current_skill = ai_skill

        return {"selected_skill": ai_skill, "model_path": model_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/moves")
def get_move(
    request: MoveRequest
):
    if current_model is None:
        raise HTTPException(status_code=400, detail="AI skill not selected. Call /api/select-skill first.")
    try:
        print("current_skill", current_skill)
        move, result, termination = play_moves(
            current_model,
            request.fen,
            device
        )

        return {
            "move": move,
            "result": result,
            "termination": termination
        }
    except Exception as e:
        print("Error in /api/moves:", e)
        raise HTTPException(status_code=500, detail=str(e))