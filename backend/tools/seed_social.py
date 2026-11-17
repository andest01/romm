#!/usr/bin/env python3
"""Seed members, a social group, collections and save trees through the HTTP API.

Every write goes through the public API, the same path a client takes, so the
seed exercises permissions, visibility and the snapshot write path for real.
Rerunning it is safe: existing groups, users, collections and channels are reused.

Profiles add up: family < friends < social.
  family   2 kids beside the admin, one shared collection
  friends  + 6 friends
  social   + 12 members and a save tree per game in --saves-dir

Usage:
  python tools/seed_social.py --url http://127.0.0.1:5000 --profile social \
      --admin-user admin --saves-dir ~/seed-saves
"""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any, Final

import httpx2

GROUP_NAME: Final = "Seeded members"
COLLECTION_NAME: Final = "Family favorites"
GAME_BOY_SLUGS: Final = ("gb", "gbc")
EMPTY_UPLOAD: Final = {"_": ("", b"")}

PROFILE_USERS: Final[dict[str, list[str]]] = {
    "family": ["kid-ada", "kid-ben"],
    "friends": ["fern", "gus", "hana", "ivo", "juno", "kai"],
    "social": [
        "lena",
        "milo",
        "nia",
        "omar",
        "pia",
        "quin",
        "rosa",
        "sami",
        "tess",
        "uma",
        "vik",
        "wren",
    ],
}
PROFILE_ORDER: Final = ("family", "friends", "social")

LIBRARY_GRANTS: Final[list[dict[str, Any]]] = [
    {"entity": "roms", "action": "read"},
    {"entity": "platforms", "action": "read"},
    {"entity": "firmware", "action": "read"},
    {"entity": "emulation", "action": "read"},
    {"entity": "collections", "action": "read"},
    {"entity": "collections", "action": "write", "own_only": True},
    {"entity": "assets", "action": "read"},
    {"entity": "assets", "action": "write", "own_only": True},
    {"entity": "assets", "action": "delete", "own_only": True},
    {"entity": "devices", "action": "read", "own_only": True},
    {"entity": "devices", "action": "write", "own_only": True},
]
SOCIAL_GRANTS: Final[list[dict[str, Any]]] = [
    {"entity": "social", "action": "read"},
    {"entity": "social", "action": "write"},
]


def members_for(profile: str) -> list[str]:
    """The usernames a profile seeds, including every smaller profile's."""
    upto = PROFILE_ORDER.index(profile) + 1
    return [name for p in PROFILE_ORDER[:upto] for name in PROFILE_USERS[p]]


def login(base: str, username: str, password: str) -> httpx2.Client:
    """A client whose token carries every scope the user holds."""

    def token(scopes: str) -> str:
        response = httpx2.post(
            f"{base}/api/token",
            data={"username": username, "password": password, "scope": scopes},
        )
        response.raise_for_status()
        return str(response.json()["access_token"])

    probe = token("me.read")
    me = httpx2.get(
        f"{base}/api/users/me", headers={"Authorization": f"Bearer {probe}"}
    )
    me.raise_for_status()
    scopes = " ".join(me.json()["oauth_scopes"])
    return httpx2.Client(
        base_url=base,
        headers={"Authorization": f"Bearer {token(scopes)}"},
        timeout=60,
    )


def ensure_group(admin: httpx2.Client, social: bool) -> int:
    grants = LIBRARY_GRANTS + (SOCIAL_GRANTS if social else [])
    groups = admin.get("/api/permissions/groups").raise_for_status().json()
    existing = next((g for g in groups if g["name"] == GROUP_NAME), None)
    if existing:
        admin.put(
            f"/api/permissions/groups/{existing['id']}", json={"grants": grants}
        ).raise_for_status()
        return int(existing["id"])
    created = admin.post(
        "/api/permissions/groups",
        json={
            "name": GROUP_NAME,
            "description": "Created by tools/seed_social.py",
            "grants": grants,
        },
    ).raise_for_status()
    return int(created.json()["id"])


def ensure_users(
    admin: httpx2.Client, usernames: list[str], password: str, group_id: int
) -> None:
    known = {u["username"] for u in admin.get("/api/users").raise_for_status().json()}
    for name in usernames:
        if name not in known:
            admin.post(
                "/api/users",
                json={
                    "username": name,
                    "email": f"{name}@seed.invalid",
                    "password": password,
                    "role": "user",
                },
            ).raise_for_status()
    users = admin.get("/api/users").raise_for_status().json()
    for user in users:
        if user["username"] in usernames:
            admin.put(
                f"/api/permissions/users/{user['id']}",
                json={"set_group": True, "permission_group_id": group_id},
            ).raise_for_status()


def game_boy_roms(admin: httpx2.Client) -> list[dict[str, Any]]:
    platforms = admin.get("/api/platforms").raise_for_status().json()
    ids = [p["id"] for p in platforms if p["slug"] in GAME_BOY_SLUGS]
    if not ids:
        return []
    page = admin.get(
        "/api/roms", params={"platform_ids": ids, "limit": 200}
    ).raise_for_status()
    return [r for r in page.json()["items"] if r["files"]]


def ensure_collection(admin: httpx2.Client, rom_ids: list[int]) -> None:
    collections = admin.get("/api/collections").raise_for_status().json()
    existing = next((c for c in collections if c["name"] == COLLECTION_NAME), None)
    if existing is None:
        existing = (
            admin.post(
                "/api/collections",
                params={"is_public": True},
                data={"name": COLLECTION_NAME, "description": "Seeded"},
            )
            .raise_for_status()
            .json()
        )
    admin.put(
        f"/api/collections/{existing['id']}",
        params={"is_public": True},
        data={"name": COLLECTION_NAME, "rom_ids": json.dumps(rom_ids)},
    ).raise_for_status()


def push_snapshot(
    client: httpx2.Client,
    manifest: dict[str, Any],
    files: dict[str, tuple[str, bytes]] | None = None,
) -> dict[str, Any]:
    response = client.post(
        "/api/snapshots",
        data={"manifest": json.dumps(manifest)},
        files=files or EMPTY_UPLOAD,
    )
    response.raise_for_status()
    body: dict[str, Any] = response.json()
    return body


def channel_labelled(
    client: httpx2.Client, rom_file_id: int, label: str
) -> dict[str, Any] | None:
    channels = client.get(
        "/api/channels", params={"rom_file_id": rom_file_id}
    ).raise_for_status()
    return next(
        (c for c in channels.json() if c["is_own"] and c["label"] == label), None
    )


def seed_save_tree(clients: list[httpx2.Client], rom_file_id: int, save: Path) -> None:
    """The first member shares a save; each next member forks the one before,
    and every third also forks the root, so the tree has a trunk and branches."""
    data = save.read_bytes()
    root_owner = clients[0]
    root = channel_labelled(root_owner, rom_file_id, "seed")
    if root is None:
        snapshot = push_snapshot(
            root_owner,
            {
                "rom_file_id": rom_file_id,
                "expected_current_id": None,
                "label": "seed",
                "save": {
                    "hash": hashlib.md5(data, usedforsecurity=False).hexdigest(),
                    "shape": "SINGLE",
                    "format": "neutral",
                },
            },
            {"save": (save.name, data)},
        )
        root_owner.patch(
            f"/api/channels/{snapshot['channel_id']}", json={"is_public": True}
        ).raise_for_status()
        root_id = int(snapshot["id"])
    else:
        root_id = int(root["current_snapshot_id"])

    previous = root_id
    for index, client in enumerate(clients[1:], start=1):
        parent = root_id if index % 3 == 0 else previous
        mine = channel_labelled(client, rom_file_id, "seed-fork")
        if mine is None:
            fork = push_snapshot(
                client,
                {
                    "rom_file_id": rom_file_id,
                    "expected_current_id": None,
                    "label": "seed-fork",
                    "parent_snapshot_id": parent,
                },
            )
            client.patch(
                f"/api/channels/{fork['channel_id']}", json={"is_public": True}
            ).raise_for_status()
            previous = int(fork["id"])
        else:
            previous = int(mine["current_snapshot_id"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default="http://127.0.0.1:5000")
    parser.add_argument("--profile", choices=PROFILE_ORDER, default="family")
    parser.add_argument(
        "--social",
        choices=("on", "off"),
        default="on",
        help="Grant the Social permission to the seeded group (default: on).",
    )
    parser.add_argument("--admin-user", default="admin")
    parser.add_argument(
        "--admin-password",
        default=os.environ.get("ROMM_SEED_ADMIN_PASSWORD"),
        help="Defaults to $ROMM_SEED_ADMIN_PASSWORD.",
    )
    parser.add_argument(
        "--member-password",
        default=os.environ.get("ROMM_SEED_MEMBER_PASSWORD", "seed-member-pass"),
        help="Password for every seeded member (dev servers only).",
    )
    parser.add_argument(
        "--saves-dir",
        type=Path,
        help="Saves named after a ROM's file name stem, e.g. tobu.sav for tobu.gb.",
    )
    args = parser.parse_args()
    if not args.admin_password:
        parser.error("--admin-password or $ROMM_SEED_ADMIN_PASSWORD is required")

    base = args.url.rstrip("/")
    admin = login(base, args.admin_user, args.admin_password)
    usernames = members_for(args.profile)

    group_id = ensure_group(admin, social=args.social == "on")
    ensure_users(admin, usernames, args.member_password, group_id)
    print(f"group '{GROUP_NAME}' (social {args.social}), {len(usernames)} members")

    roms = game_boy_roms(admin)
    if not roms:
        print("no Game Boy ROMs in the library: add homebrew, scan, then rerun")
        return 0
    ensure_collection(admin, [r["id"] for r in roms])
    print(f"collection '{COLLECTION_NAME}' with {len(roms)} games")

    if args.profile != "social" or args.saves_dir is None:
        return 0
    members = [login(base, name, args.member_password) for name in usernames]
    trees = 0
    for rom in roms:
        rom_file = rom["files"][0]
        stem = Path(rom_file["file_name"]).stem
        save = next(args.saves_dir.glob(f"{stem}.*"), None)
        if save is not None:
            seed_save_tree(members, int(rom_file["id"]), save)
            trees += 1
    print(f"{trees} save trees across {len(members)} members")
    return 0


if __name__ == "__main__":
    sys.exit(main())
