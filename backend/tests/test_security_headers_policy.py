from app.main import build_security_headers


def test_security_headers_include_csp() -> None:
    headers = build_security_headers(app_env="development")

    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert "Content-Security-Policy" in headers
    assert "Strict-Transport-Security" not in headers


def test_security_headers_include_hsts_in_production() -> None:
    headers = build_security_headers(app_env="production")

    assert "Strict-Transport-Security" in headers
    assert headers["Strict-Transport-Security"].startswith("max-age=")
