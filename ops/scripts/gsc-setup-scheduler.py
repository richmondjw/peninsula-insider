"""
Registers the GSC weekly runner as a Windows Task Scheduler task.
Run once as administrator (or accept the UAC prompt).

Schedule: every Sunday at 07:00 AEST = 21:00 UTC Saturday
Task name: PeninsulaInsider-GSC-Weekly
"""

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).parent
BAT     = SCRIPTS / "gsc-weekly-runner.bat"
TASK    = "PeninsulaInsider-GSC-Weekly"

# Sunday 07:00 AEST = Saturday 21:00 UTC
# Task Scheduler uses local time — adjust if timezone differs
SCHEDULE_DAY  = "SUN"
SCHEDULE_TIME = "07:00"

cmd = [
    "schtasks", "/create",
    "/tn", TASK,
    "/tr", str(BAT),
    "/sc", "WEEKLY",
    "/d", SCHEDULE_DAY,
    "/st", SCHEDULE_TIME,
    "/f",   # overwrite if exists
]

print(f"Registering task: {TASK}")
print(f"Schedule: {SCHEDULE_DAY} {SCHEDULE_TIME} local time")
print(f"Script: {BAT}")
print()

result = subprocess.run(cmd, capture_output=True, text=True)
if result.returncode == 0:
    print("Task registered successfully.")
    print(result.stdout.strip())
else:
    print("Error registering task:")
    print(result.stderr.strip() or result.stdout.strip())
    print()
    print("If access denied, run this script as Administrator:")
    print(f'  Start-Process python -ArgumentList "{__file__}" -Verb RunAs')
    sys.exit(1)
