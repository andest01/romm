#!/usr/bin/env python3
"""Run the image inventory directly, without a task worker.

Records every cover and media image under the resources folder in `images`,
links covers, and reports rows whose file is gone (deleted only with --prune).

Run from the backend directory:

    uv run tools/inventory_images.py                       # the configured resources folder
    uv run tools/inventory_images.py --root /mnt/r         # another resources folder (e.g. a mount)
    uv run tools/inventory_images.py --platform 60 --limit 200
    uv run tools/inventory_images.py --prune               # also delete vanished rows
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Allow running as `python3 tools/inventory_images.py` from backend/.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import RESOURCES_BASE_PATH  # noqa: E402
from tasks.manual.inventory_images import run_inventory  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--root", default=RESOURCES_BASE_PATH, help="Resources folder")
    parser.add_argument("--platform", type=int, action="append", default=[])
    parser.add_argument(
        "--limit", type=int, default=None, help="Stop after this many images"
    )
    parser.add_argument(
        "--prune", action="store_true", help="Delete rows whose file is gone"
    )
    args = parser.parse_args()

    result = run_inventory(
        Path(args.root), prune=args.prune, platform_ids=args.platform, limit=args.limit
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
