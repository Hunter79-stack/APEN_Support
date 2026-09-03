import os
import ipaddress


def _parse_networks(env_val):
    """Parse a comma/semicolon-separated list of CIDRs from an env var."""
    nets = []
    for tok in (env_val or "").replace(";", ",").split(","):
        tok = tok.strip()
        if not tok:
            continue
        try:
            nets.append(ipaddress.ip_network(tok, strict=False))
        except ValueError:
            pass
    return nets


def _truthy(v):
    return str(v).strip().lower() in ("1", "true", "yes", "on")


# Organisation/site allowlists (kept from the original deployment).
_ORG_NETWORKS = [
    ipaddress.ip_network("140.32.70.0/23"),  # CESC DREN IPs
    ipaddress.ip_network("10.100.4.0/24"),   # MCBL DREN IPs
    ipaddress.ip_network("172.16.0.0/16"),   # BLCSE CUI IPs
]

# Loopback is always trusted so the page works when opened on the host itself
# and so health checks succeed.
_LOOPBACK = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
]

# RFC1918 / link-local private ranges — trusted by default because this is an
# internal, self-hosted diagnostic tool that is normally reached over a LAN.
# Drop them with SPEEDTEST_TRUST_PRIVATE=0 to restrict to the org ranges only.
_PRIVATE = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),   # CGNAT / Tailscale
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

AUTHORIZED_NETWORKS = list(_ORG_NETWORKS) + _LOOPBACK
if os.getenv("SPEEDTEST_TRUST_PRIVATE", "1") != "0":
    AUTHORIZED_NETWORKS += _PRIVATE
# Extra networks may be added without code changes (comma-separated CIDRs).
AUTHORIZED_NETWORKS += _parse_networks(os.getenv("SPEEDTEST_AUTHORIZED_NETWORKS"))

# Access control. This is a self-hosted diagnostic tool, so the IP gate is OPEN
# by default (any client may run a test) — matching the combined network-analysis
# app, which has no gate. To restrict access, set SPEEDTEST_ALLOW_ALL=0; the
# AUTHORIZED_NETWORKS allowlist above (loopback + private + org + any added via
# SPEEDTEST_AUTHORIZED_NETWORKS) then applies.
ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))

# Test IP for automated testing (must stay outside every trusted range above).
TEST_UNAUTHORIZED_IP = "22.22.22.22"

# Server settings
HOST = os.getenv("SPEEDTEST_HOST", "0.0.0.0")
PORT = int(os.getenv("SPEEDTEST_PORT", 8083))

# Speed test parameters
PING_COUNT      = int(os.getenv("SPEEDTEST_PING_COUNT", 10))
CHUNK_SIZE      = int(os.getenv("SPEEDTEST_CHUNK_SIZE", 1048576))      # 1 MiB upload chunk
DOWNLOAD_SIZE   = int(os.getenv("SPEEDTEST_DOWNLOAD_SIZE", 4194304))   # 4 MiB per download request
TIMEOUT_SECONDS = float(os.getenv("SPEEDTEST_TIMEOUT", 15.0))          # seconds per phase
# Parallel TCP streams used for the download/upload phases. A single stream is
# capped by latency x window (the bandwidth-delay product) and badly under-reads
# on fast or high-latency links, so real speed tests fan out across several.
STREAMS         = max(1, int(os.getenv("SPEEDTEST_STREAMS", 4)))
# Warm-up window (ms) discarded before measuring, so TCP slow-start ramp-up is
# excluded and the figure reflects steady-state throughput.
WARMUP_MS       = int(os.getenv("SPEEDTEST_WARMUP_MS", 1500))
