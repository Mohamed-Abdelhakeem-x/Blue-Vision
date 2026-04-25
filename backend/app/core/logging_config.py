import json
import logging
import sys
from datetime import datetime, timezone

from app.core.request_context import request_id as _request_id_ctx


class _JsonFormatter(logging.Formatter):
    """Emit each log record as a single-line JSON object including the active request_id."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        rid = _request_id_ctx.get("")
        if rid:
            payload["request_id"] = rid

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def configure_logging(*, level: str = "INFO") -> None:
    """Switch root logger to structured JSON output.

    Safe to call multiple times; subsequent calls only update formatters.
    """
    root = logging.getLogger()
    root.setLevel(level)

    formatter = _JsonFormatter()
    if root.handlers:
        for handler in root.handlers:
            handler.setFormatter(formatter)
    else:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        root.addHandler(handler)
