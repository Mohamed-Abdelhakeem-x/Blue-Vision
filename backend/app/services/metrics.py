from threading import Lock
from time import perf_counter


class MetricsStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._request_count: dict[str, int] = {}
        self._error_count: dict[str, int] = {}
        self._latency_sum_seconds: dict[str, float] = {}
        self._latency_samples: dict[str, list[float]] = {}
        self._max_samples_per_route = 500

    def record(self, *, route: str, status_code: int, elapsed_seconds: float) -> None:
        with self._lock:
            self._request_count[route] = self._request_count.get(route, 0) + 1
            self._latency_sum_seconds[route] = self._latency_sum_seconds.get(route, 0.0) + elapsed_seconds
            route_samples = self._latency_samples.setdefault(route, [])
            route_samples.append(elapsed_seconds)
            if len(route_samples) > self._max_samples_per_route:
                del route_samples[: len(route_samples) - self._max_samples_per_route]
            if status_code >= 400:
                self._error_count[route] = self._error_count.get(route, 0) + 1

    @staticmethod
    def _p95(samples: list[float]) -> float:
        if not samples:
            return 0.0
        sorted_samples = sorted(samples)
        index = int((len(sorted_samples) - 1) * 0.95)
        return sorted_samples[index]

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        with self._lock:
            routes = set(self._request_count) | set(self._error_count) | set(self._latency_sum_seconds)
            metrics: dict[str, dict[str, float | int]] = {}
            for route in sorted(routes):
                count = self._request_count.get(route, 0)
                error_count = self._error_count.get(route, 0)
                latency_sum = self._latency_sum_seconds.get(route, 0.0)
                latency_p95 = self._p95(self._latency_samples.get(route, []))
                avg_latency = latency_sum / count if count > 0 else 0.0
                metrics[route] = {
                    "requests_total": count,
                    "errors_total": error_count,
                    "latency_seconds_sum": round(latency_sum, 6),
                    "latency_seconds_avg": round(avg_latency, 6),
                    "latency_seconds_p95": round(latency_p95, 6),
                }
            return metrics

    def slo_snapshot(
        self,
        *,
        target_availability: float,
        target_p95_seconds: float,
        min_requests_for_evaluation: int,
    ) -> dict[str, float | int | bool | str]:
        with self._lock:
            total_requests = sum(self._request_count.values())
            total_errors = sum(self._error_count.values())
            total_latency = sum(self._latency_sum_seconds.values())

            all_samples: list[float] = []
            for route_samples in self._latency_samples.values():
                all_samples.extend(route_samples)

            availability = ((total_requests - total_errors) / total_requests) if total_requests > 0 else 1.0
            error_rate = 1.0 - availability
            p95_latency = self._p95(all_samples)
            avg_latency = (total_latency / total_requests) if total_requests > 0 else 0.0
            enough_data = total_requests >= min_requests_for_evaluation
            slo_ok = availability >= target_availability and p95_latency <= target_p95_seconds
            error_budget_target = max(0.0, 1.0 - target_availability)
            error_budget_remaining = max(0.0, error_budget_target - error_rate)
            burn_rate = (error_rate / error_budget_target) if error_budget_target > 0 else 0.0

            if not enough_data:
                policy_status = "insufficient_data"
            elif not slo_ok:
                policy_status = "breach"
            elif burn_rate >= 1.0:
                policy_status = "at_risk"
            else:
                policy_status = "healthy"

            return {
                "requests_total": total_requests,
                "errors_total": total_errors,
                "availability": round(availability, 6),
                "error_rate": round(error_rate, 6),
                "latency_seconds_avg": round(avg_latency, 6),
                "latency_seconds_p95": round(p95_latency, 6),
                "target_availability": target_availability,
                "target_latency_seconds_p95": target_p95_seconds,
                "error_budget_target": round(error_budget_target, 6),
                "error_budget_remaining": round(error_budget_remaining, 6),
                "error_budget_burn_rate": round(burn_rate, 6),
                "min_requests_for_evaluation": min_requests_for_evaluation,
                "enough_data": enough_data,
                "availability_ok": availability >= target_availability,
                "error_budget_ok": error_rate <= error_budget_target,
                "latency_ok": p95_latency <= target_p95_seconds,
                "slo_ok": slo_ok,
                "enforceable_slo_ok": (not enough_data) or slo_ok,
                "policy_status": policy_status,
            }

    def reset(self) -> None:
        with self._lock:
            self._request_count.clear()
            self._error_count.clear()
            self._latency_sum_seconds.clear()
            self._latency_samples.clear()


_METRICS_STORE = MetricsStore()


def begin_timer() -> float:
    return perf_counter()


def record_request_metric(*, route: str, status_code: int, start_time: float) -> None:
    elapsed = perf_counter() - start_time
    _METRICS_STORE.record(route=route, status_code=status_code, elapsed_seconds=elapsed)


def render_metrics_snapshot() -> dict[str, dict[str, float | int]]:
    return _METRICS_STORE.snapshot()


def render_prometheus_metrics() -> str:
    snapshot = _METRICS_STORE.snapshot()
    lines: list[str] = [
        "# HELP bluevision_http_requests_total Total HTTP requests by route",
        "# TYPE bluevision_http_requests_total counter",
        "# HELP bluevision_http_errors_total Total HTTP errors (status>=400) by route",
        "# TYPE bluevision_http_errors_total counter",
        "# HELP bluevision_http_latency_seconds_sum Cumulative request latency by route in seconds",
        "# TYPE bluevision_http_latency_seconds_sum counter",
        "# HELP bluevision_http_latency_seconds_avg Average request latency by route in seconds",
        "# TYPE bluevision_http_latency_seconds_avg gauge",
        "# HELP bluevision_http_latency_seconds_p95 Approximate p95 request latency by route in seconds",
        "# TYPE bluevision_http_latency_seconds_p95 gauge",
    ]

    for route, values in snapshot.items():
        route_label = route.replace('\\', '\\\\').replace('"', '\\"')
        lines.append(
            f'bluevision_http_requests_total{{route="{route_label}"}} {values["requests_total"]}'
        )
        lines.append(
            f'bluevision_http_errors_total{{route="{route_label}"}} {values["errors_total"]}'
        )
        lines.append(
            f'bluevision_http_latency_seconds_sum{{route="{route_label}"}} {values["latency_seconds_sum"]}'
        )
        lines.append(
            f'bluevision_http_latency_seconds_avg{{route="{route_label}"}} {values["latency_seconds_avg"]}'
        )
        lines.append(
            f'bluevision_http_latency_seconds_p95{{route="{route_label}"}} {values["latency_seconds_p95"]}'
        )

    return "\n".join(lines) + "\n"


def render_slo_snapshot(
    *,
    target_availability: float = 0.99,
    target_p95_seconds: float = 0.75,
    min_requests_for_evaluation: int = 50,
) -> dict[str, float | int | bool | str]:
    return _METRICS_STORE.slo_snapshot(
        target_availability=target_availability,
        target_p95_seconds=target_p95_seconds,
        min_requests_for_evaluation=min_requests_for_evaluation,
    )


def clear_metrics_store() -> None:
    _METRICS_STORE.reset()
