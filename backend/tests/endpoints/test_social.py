from fastapi import status
from fastapi.testclient import TestClient
from tests.auth_helpers import bearer, user_headers

from handler.auth.constants import Scope
from handler.auth.permissions_map import grants_to_scopes
from handler.database import db_user_handler
from handler.database.base_handler import sync_session
from models.permission import PermAction, PermEntity, PermissionGroup
from models.user import User

MEMBERS = "/api/social/members"


def _cleanup() -> None:
    with sync_session.begin() as s:
        s.query(PermissionGroup).filter(PermissionGroup.system_key.is_(None)).delete(
            synchronize_session="evaluate"
        )


def _join_social_group(client: TestClient, access_token: str, user: User) -> None:
    gid = client.post(
        "/api/permissions/groups",
        headers=bearer(access_token),
        json={
            "name": "Social",
            "grants": [
                {"entity": "roms", "action": "read"},
                {"entity": "social", "action": "read"},
                {"entity": "social", "action": "write"},
            ],
        },
    ).json()["id"]
    client.put(
        f"/api/permissions/users/{user.id}",
        headers=bearer(access_token),
        json={"set_group": True, "permission_group_id": gid},
    )


def test_social_grants_project_to_social_scopes():
    # Arrange
    grants = [
        (PermEntity.SOCIAL, PermAction.READ, False),
        (PermEntity.SOCIAL, PermAction.WRITE, False),
    ]

    # Act
    scopes = grants_to_scopes(grants)

    # Assert
    assert {Scope.SOCIAL_READ, Scope.SOCIAL_WRITE} <= set(scopes)


def test_a_viewer_has_no_social_scope_by_default(viewer_user: User):
    # Act
    scopes = viewer_user.oauth_scopes

    # Assert
    assert Scope.SOCIAL_READ not in scopes
    assert Scope.SOCIAL_WRITE not in scopes


def test_a_viewer_without_social_cannot_list_members(
    client: TestClient, viewer_access_token: str
):
    # Act
    response = client.get(MEMBERS, headers=bearer(viewer_access_token))

    # Assert
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_an_admin_lists_members_with_only_public_fields(
    client: TestClient, access_token: str, admin_user: User, viewer_user: User
):
    # Act
    response = client.get(MEMBERS, headers=bearer(access_token))

    # Assert
    assert response.status_code == status.HTTP_200_OK
    members = response.json()
    assert {m["username"] for m in members} >= {
        admin_user.username,
        viewer_user.username,
    }
    assert all(
        set(m) == {"id", "username", "avatar_path", "last_active"} for m in members
    )


def test_a_member_of_a_social_group_lists_members(
    client: TestClient, access_token: str, viewer_user: User
):
    try:
        # Arrange
        _join_social_group(client, access_token, viewer_user)
        user = db_user_handler.get_user(viewer_user.id)
        assert user is not None

        # Act
        response = client.get(MEMBERS, headers=user_headers(user))

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert viewer_user.username in {m["username"] for m in response.json()}
    finally:
        _cleanup()
