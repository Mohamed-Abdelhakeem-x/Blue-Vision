import asyncio
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.bootstrap import seed_metadata_if_empty


async def main() -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        await seed_metadata_if_empty(session, settings.labels_path)


if __name__ == "__main__":
    asyncio.run(main())
