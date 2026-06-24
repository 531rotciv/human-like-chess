from pydantic import BaseModel

class SkillSelectionRequest(BaseModel):
    ai_skill: str
