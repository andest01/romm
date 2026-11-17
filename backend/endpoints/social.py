from fastapi import Request

from decorators.auth import protected_route
from endpoints.responses.social import SocialMemberSchema
from handler.auth.constants import Scope
from handler.database import db_user_handler
from models.user import User
from utils.router import APIRouter

router = APIRouter(
    prefix="/social",
    tags=["social"],
)


@protected_route(router.get, "/members", [Scope.SOCIAL_READ])
def get_members(request: Request) -> list[SocialMemberSchema]:
    """Every member of the server, with only what other members may see."""
    users = db_user_handler.get_users(
        only_fields=[User.id, User.username, User.avatar_path, User.last_active]
    )
    return [
        SocialMemberSchema(
            id=user.id,
            username=user.username,
            avatar_path=user.avatar_path,
            last_active=user.last_active,
        )
        for user in users
        if not user.is_kiosk_guest
    ]
