import asyncio
from collections import Counter
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from config import RESOURCES_BASE_PATH
from handler.database import db_image_handler
from handler.database.images_handler import ImageFacts
from handler.filesystem.image_inventory import (
    classify,
    cover_source_path,
    iter_resource_files,
    read_facts,
)
from logger.logger import log
from tasks.registry import INVENTORY_IMAGES_SPEC
from tasks.tasks import Task

BATCH_SIZE = 500


def run_inventory(
    root: Path,
    *,
    prune: bool = False,
    platform_ids: Sequence[int] = (),
    limit: int | None = None,
) -> dict[str, Any]:
    """Record every known image under `root` in `images`, link covers, and find vanished rows.

    Unchanged files (same byte size as their row) are skipped without being read, so a
    rerun only reads what is new or changed. Vanished rows are only deleted with `prune`.
    """
    report: Counter[str] = Counter()
    kinds: Counter[str] = Counter()
    seen: set[str] = set()
    pending: list[str] = []

    def flush() -> None:
        known = db_image_handler.get_bytes_by_path(pending)
        facts: list[ImageFacts] = []
        for path in pending:
            if known.get(path) == (root / path).stat().st_size:
                report["unchanged"] += 1
                continue
            try:
                facts.append(read_facts(root, path))
            except Exception as exc:  # noqa: BLE001 - one bad file never stops the run
                log.warning(f"Unable to read {path}: {exc}")
                report["failed"] += 1
        inserted, updated = db_image_handler.upsert_images(facts)
        report["inserted"] += inserted
        report["updated"] += updated
        pending.clear()

    for path in iter_resource_files(root, platform_ids):
        location = classify(path)
        if location is None:
            report["not an image we track"] += 1
            continue
        seen.add(path)
        kinds[location.kind] += 1
        pending.append(path)
        if len(pending) >= BATCH_SIZE:
            flush()
        if limit and len(seen) >= limit:
            break
    if pending:
        flush()

    report["cover links written"], report["cover links removed"] = (
        db_image_handler.link_covers()
    )

    report["copies linked to their original"] = db_image_handler.link_sources(
        {path: cover_source_path(path) for path in seen}
    )

    vanished = _vanished_rows(root, seen, platform_ids, full_walk=limit is None)
    report["vanished rows"] = len(vanished)
    if prune:
        report["rows deleted"] = db_image_handler.delete_images(vanished)

    result = {"images found": len(seen), **report, "by kind": dict(kinds)}
    log.info(f"Image inventory of {root}: {result}")
    return result


def _vanished_rows(
    root: Path, seen: set[str], platform_ids: Sequence[int], *, full_walk: bool
) -> list[int]:
    """Rows inside the walked scope whose file is gone; none when the walk saw nothing."""
    # An empty or unmounted resources folder looks like "every file deleted".
    if not seen or not full_walk:
        return []
    platforms = set(platform_ids)
    vanished = []
    for image_id, path in db_image_handler.list_image_paths():
        location = classify(path)
        if location is None or path in seen:
            continue
        if platforms and location.platform_id not in platforms:
            continue
        if not (root / path).exists():
            vanished.append(image_id)
    return vanished


class InventoryImagesTask(Task):
    def __init__(self) -> None:
        super().__init__(INVENTORY_IMAGES_SPEC)

    async def run(
        self,
        prune: bool = False,
        platform_ids: list[int] | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Inventory the resources folder; see `run_inventory`."""
        return await asyncio.to_thread(
            run_inventory,
            Path(RESOURCES_BASE_PATH),
            prune=prune,
            platform_ids=platform_ids or (),
            limit=limit,
        )


inventory_images_task = InventoryImagesTask()
