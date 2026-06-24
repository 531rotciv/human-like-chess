from pydantic import BaseModel
from typing import Optional


class MoveRequest(BaseModel):
    fen: str
    ai_skill: Optional[int] = None