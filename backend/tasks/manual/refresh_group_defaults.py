"""Re-pick each group's default version when `scan.priority.region` changes."""

from handler.database import db_rom_handler
from logger.logger import log
from tasks.registry import REFRESH_GROUP_DEFAULTS_SPEC
from tasks.tasks import Task


class RefreshGroupDefaultsTask(Task):
    def __init__(self) -> None:
        super().__init__(REFRESH_GROUP_DEFAULTS_SPEC)

    async def run(self) -> None:
        db_rom_handler.refresh_all_group_defaults()
        log.info(f"{self.spec.title} complete")


refresh_group_defaults_task = RefreshGroupDefaultsTask()
