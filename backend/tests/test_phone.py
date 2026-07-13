from services.phone import e164_to_local


def test_e164_to_local_converts_valid_nigerian_number():
    assert e164_to_local("+2348031234567") == "08031234567"


def test_e164_to_local_strips_whitespace():
    assert e164_to_local("  +2348031234567  ") == "08031234567"


def test_e164_to_local_rejects_wrong_country_code():
    assert e164_to_local("+14155552671") is None


def test_e164_to_local_rejects_too_few_digits():
    assert e164_to_local("+234803123456") is None  # 9 digits after country code


def test_e164_to_local_rejects_too_many_digits():
    assert e164_to_local("+23480312345678") is None  # 11 digits after country code


def test_e164_to_local_rejects_redundant_leading_zero():
    # +234 followed by the full local number (leading 0 not stripped) is 11
    # digits, not 10 -- caught by the same length check as "too many digits".
    assert e164_to_local("+23408031234567") is None


def test_e164_to_local_rejects_non_digit_characters():
    assert e164_to_local("+234803123456a") is None


def test_e164_to_local_rejects_missing_plus():
    assert e164_to_local("2348031234567") is None
