import time
import statistics
from typing import Optional, Dict
from backend.config import PING_COUNT

def measure_latency(count: Optional[int] = None) -> Dict[str, float]:
    """
    Return a dictionary with keys:
      min  - minimum round-trip time in milliseconds
      avg  - average round-trip time in milliseconds
      max  - maximum round-trip time in milliseconds
      jit  - population standard deviation of samples in milliseconds

    Measures count back-to-back loops using a high-precision clock.
    """
    count = count or PING_COUNT
    timer = time.perf_counter

    samples = []
    for _ in range(count):
        t0 = timer()
        t1 = timer()
        samples.append((t1 - t0) * 1000)

    mn  = min(samples)
    mx  = max(samples)
    avg = sum(samples) / count
    jit = statistics.pstdev(samples) if count > 1 else 0.0

    return {"min": mn, "avg": avg, "max": mx, "jit": jit}
