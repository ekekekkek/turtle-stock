def has_sufficient_data(data, required_days=252, min_coverage=0.8):
    """
    Returns True if data is 'sufficient' for analysis.
    - data: list or array of daily data points
    - required_days: expected number of days (default: 252)
    - min_coverage: minimum fraction of required_days (default: 80%)
    """
    actual_days = len(data)
    min_days = int(required_days * min_coverage)
    print(f"Actual days: {actual_days}, Required: {required_days}, Minimum accepted: {min_days}")
    return actual_days >= min_days

# --- Test cases ---
print("Test 1 (strict, 252 needed):", has_sufficient_data(list(range(252))))  # True
print("Test 2 (strict, 252 needed):", has_sufficient_data(list(range(200))))  # False
print("Test 3 (flexible, 80%):", has_sufficient_data(list(range(210)), required_days=252, min_coverage=0.8))  # True
print("Test 4 (flexible, 80%):", has_sufficient_data(list(range(180)), required_days=252, min_coverage=0.8))  # False 