from data.derive_real_data import derive_rows


def test_derive_rows_computes_headway_between_consecutive_arrivals():
    raw_logs = {
        "cits-bariga": {
            "log1": {"state": "arrived", "currentStop": "CITS", "loggedAt": 1_000_000},
            "log2": {"state": "on_route", "currentStop": "Bariga", "loggedAt": 1_050_000},
            "log3": {"state": "arrived", "currentStop": "CITS", "loggedAt": 1_600_000},
        }
    }

    rows = derive_rows(raw_logs)

    assert len(rows) == 1
    assert rows[0]["stop"] == "CITS"
    assert rows[0]["headway_minutes"] == 10.0
    assert rows[0]["weather_flag"] == 0
    assert rows[0]["queue_count"] == 0


def test_derive_rows_ignores_non_arrival_events():
    raw_logs = {
        "cits-bariga": {
            "log1": {"state": "on_route", "currentStop": "CITS", "loggedAt": 0},
            "log2": {"state": "on_route", "currentStop": "CITS", "loggedAt": 600_000},
        }
    }

    assert derive_rows(raw_logs) == []


def test_derive_rows_skips_overnight_gaps():
    raw_logs = {
        "cits-bariga": {
            "log1": {"state": "arrived", "currentStop": "CITS", "loggedAt": 0},
            "log2": {"state": "arrived", "currentStop": "CITS", "loggedAt": 6 * 60 * 60 * 1000},
        }
    }

    assert derive_rows(raw_logs) == []


def test_derive_rows_merges_arrivals_across_routes_sharing_a_stop():
    raw_logs = {
        "cits-bariga": {
            "log1": {"state": "arrived", "currentStop": "CITS", "loggedAt": 0},
        },
        "cits-yaba": {
            "log2": {"state": "arrived", "currentStop": "CITS", "loggedAt": 300_000},
        },
    }

    rows = derive_rows(raw_logs)

    assert len(rows) == 1
    assert rows[0]["headway_minutes"] == 5.0
