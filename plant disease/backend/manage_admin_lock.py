"""
AgriScan AI - Admin Dashboard Lock Manager
Command-line utility for authorized application owners/developers
to inspect, lock, or restore access to the Admin Dashboard.
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.db import is_admin_dashboard_locked, set_admin_dashboard_lock, init_db

def main():
    init_db()
    parser = argparse.ArgumentParser(description="AgriScan AI Admin Dashboard Lock Controller")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--status", action="store_true", help="Display current admin dashboard lock state")
    group.add_argument("--lock", action="store_true", help="Lock the Admin Dashboard completely")
    group.add_argument("--unlock", action="store_true", help="Unlock/restore access to the Admin Dashboard")

    args = parser.parse_args()

    if args.status:
        locked = is_admin_dashboard_locked()
        state_str = "LOCKED [Access blocked for everyone]" if locked else "UNLOCKED [Accessible]"
        print(f"[AgriScan AI] Admin Dashboard Status: {state_str}")
    elif args.lock:
        set_admin_dashboard_lock(True)
        print("[AgriScan AI] Admin Dashboard has been LOCKED successfully.")
    elif args.unlock:
        set_admin_dashboard_lock(False)
        print("[AgriScan AI] Admin Dashboard has been UNLOCKED successfully.")

if __name__ == "__main__":
    main()
