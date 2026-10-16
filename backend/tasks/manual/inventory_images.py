import asyncio
from collections import Counter
from collections.abc import Callable, Sequence
from functools import partial
from pathlib import Path
from typing import Any

from config import RESOURCES_BASE_PATH
from handler.database import db_image_handler
from handler.database.images_handler import ImageFacts
from handler.filesystem.image_inventory import (
    classify,
    is_media_original,
    iter_resource_files,
    original_path,
    read_facts,
)
from logger.formatter import highlight as hl
from logger.logger import log
from tasks.registry import INVENTORY_IMAGES_SPEC
from tasks.scheduled import UpdateStats
from tasks.tasks import Task

BATCH_SIZE = 500


def run_inventory(
    root: Path,
    *,
    prune: bool = False,
    platform_ids: Sequence[int] = (),
    limit: int | None = None,
    full: bool = False,
    on_progress: Callable[[int, int], None] | None = None,
) -> dict[str, Any]:
    """Record every known image under `root` in `images`, link it, and find vanished rows.

    Unchanged files (same byte size as their row) are skipped without being read, so a
    rerun only reads what is new or changed; `full` reads every file again, in place.
    Vanished rows are only deleted with `prune`. `on_progress(processed, total)` is
    called before the first batch and after each one.
    """
    report: Counter[str] = Counter()
    kinds: Counter[str] = Counter()
    seen: set[str] = set()
    # Every walked rom, even one with no media, so its stale media links go.
    media_by_rom: dict[int, dict[str, str]] = {}

    # Listed first so progress has a total; walking is cheap next to reading.
    for path in iter_resource_files(root, platform_ids):
        location = classify(path)
        if location is None:
            report["not an image we track"] += 1
            continue
        seen.add(path)
        kinds[location.kind] += 1
        if location.owner == "rom":
            media = media_by_rom.setdefault(location.owner_id, {})
            if is_media_original(path, location):
                media[location.kind] = path
        if limit and len(seen) >= limit:
            break
    paths = sorted(seen)
    log.info(
        f"Image inventory of {hl(str(root))}: {len(paths):,} images to check"
        + (" (full)" if full else "")
    )
    if on_progress:
        on_progress(0, len(paths))

    def flush(pending: list[str]) -> None:
        known = {} if full else db_image_handler.get_bytes_by_path(pending)
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

    for start in range(0, len(paths), BATCH_SIZE):
        flush(paths[start : start + BATCH_SIZE])
        done = min(start + BATCH_SIZE, len(paths))
        log.info(f"Image inventory: {done:,} / {len(paths):,}")
        if on_progress:
            on_progress(done, len(paths))

    report["cover links written"], report["cover links removed"] = (
        db_image_handler.link_covers()
    )

    report["media links written"], report["media links removed"] = (
        db_image_handler.link_media(media_by_rom)
    )
    report["copies linked to their original"] = db_image_handler.link_sources(
        {path: original_path(path) for path in seen}
    )

    vanished = _vanished_rows(root, seen, platform_ids, full_walk=limit is None)
    report["vanished rows"] = len(vanished)
    if prune:
        report["rows deleted"] = db_image_handler.delete_images(vanished)

    result = {"images found": len(seen), **report, "by kind": dict(kinds)}
    log.info(
        f"Image inventory done: {report['inserted']:,} inserted, "
        f"{report['updated']:,} updated, {report['unchanged']:,} unchanged, "
        f"{report['failed']:,} failed, {report['rows deleted']:,} deleted"
    )
    log.debug(f"Image inventory report: {result}")
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
        full: bool = False,
    ) -> dict[str, Any]:
        """Inventory the resources folder; see `run_inventory`."""
        stats = UpdateStats()
        loop = asyncio.get_running_loop()

        def on_progress(processed: int, total: int) -> None:
            # RQ finds the current job per thread, so the update runs on the loop's.
            loop.call_soon_threadsafe(
                partial(stats.update, processed=processed, total=total)
            )

        return await asyncio.to_thread(
            run_inventory,
            Path(RESOURCES_BASE_PATH),
            prune=prune,
            platform_ids=platform_ids or (),
            limit=limit,
            full=full,
            on_progress=on_progress,
        )


inventory_images_task = InventoryImagesTask()
