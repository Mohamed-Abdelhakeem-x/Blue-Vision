from dataclasses import dataclass

from app.db.session import apply_sqlite_pragmas


class _FakeCursor:
    def __init__(self) -> None:
        self.queries: list[str] = []
        self.closed = False

    def execute(self, query: str) -> None:
        self.queries.append(query)

    def close(self) -> None:
        self.closed = True


class _FakeConnection:
    def __init__(self) -> None:
        self.last_cursor = _FakeCursor()

    def cursor(self) -> _FakeCursor:
        return self.last_cursor


@dataclass
class _StubSettings:
    sqlite_journal_mode: str = "WAL"
    sqlite_synchronous: str = "NORMAL"
    sqlite_busy_timeout_ms: int = 7000
    sqlite_foreign_keys: bool = True


def test_apply_sqlite_pragmas_executes_expected_statements() -> None:
    connection = _FakeConnection()
    settings = _StubSettings()

    apply_sqlite_pragmas(connection, settings_obj=settings)

    assert connection.last_cursor.queries == [
        "PRAGMA journal_mode=WAL",
        "PRAGMA synchronous=NORMAL",
        "PRAGMA busy_timeout=7000",
        "PRAGMA foreign_keys=1",
    ]
    assert connection.last_cursor.closed is True


def test_apply_sqlite_pragmas_respects_foreign_keys_off() -> None:
    connection = _FakeConnection()
    settings = _StubSettings(sqlite_foreign_keys=False)

    apply_sqlite_pragmas(connection, settings_obj=settings)

    assert "PRAGMA foreign_keys=0" in connection.last_cursor.queries
