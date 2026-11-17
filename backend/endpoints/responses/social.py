from .base import BaseModel, UTCDatetime


class SocialMemberSchema(BaseModel):
    id: int
    username: str
    avatar_path: str
    last_active: UTCDatetime | None
