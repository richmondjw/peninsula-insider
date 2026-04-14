# Peninsula Insider — Backups and Rollback Guide

## Good news: you already have complete versioning

Every commit to this repo is a permanent, rollback-able snapshot. GitHub stores all commit history indefinitely — nothing is ever deleted. You can restore the site to any point in its history with a single command.

Check the full history any time:
```bash
git log --oneline
```

## Daily named backup tags (rolling 10-day window)

For extra safety, the `scripts/daily-backup-tag.sh` script creates a named tag each day (`backup-YYYY-MM-DD`) and prunes tags older than 10 days. This gives you clear, named restore points on top of the normal commit history.

### Run it manually
```bash
./scripts/daily-backup-tag.sh
```

### Schedule it daily (Windows Task Scheduler)
1. Open Task Scheduler → Create Basic Task
2. Trigger: Daily at your preferred time
3. Action: Start a program
4. Program: `C:\Program Files\Git\bin\bash.exe`
5. Arguments: `C:/Users/James/.openclaw/workspace/peninsula-insider/scripts/daily-backup-tag.sh`

### View current backup tags
```bash
git tag -l "backup-*"
```

## How to roll back

### Option 1: Roll back to yesterday's backup tag
```bash
git reset --hard backup-2026-04-13
git push --force origin main
```

### Option 2: Roll back a single commit
```bash
git revert <commit-hash>
git push origin main
```
This creates a new commit that undoes the specified one — safer because it preserves history.

### Option 3: Roll back to any specific commit
```bash
# Find the commit hash
git log --oneline

# Reset to it
git reset --hard <commit-hash>
git push --force origin main
```

### Option 4: Explore a past state without changing anything
```bash
git checkout backup-2026-04-10
# Browse, test, copy files out...
git checkout main
# Back to current state, nothing touched
```

## What gets backed up

Everything in the repo: all source files, content, images, build output, configuration, everything tracked in git. Not backed up: `node_modules`, `.env` files, local-only build artifacts — these are rebuilt from source when needed.

## What if something catastrophic happens

Even if the entire local repo is lost, you can re-clone from GitHub and have the complete history:
```bash
git clone https://github.com/richmondjw/peninsula-insider.git
```

All backup tags, all commits, all history — restored.
