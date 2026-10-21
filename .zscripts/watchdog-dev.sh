#!/bin/bash
# Watchdog: restart Next.js dev server if it dies.
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" >/dev/null 2>&1 && ! pgrep -f "next dev" >/dev/null 2>&1; then
    echo "[$(date)] Starting next dev..." >> /home/z/my-project/.zscripts/watchdog.log
    nohup bun x next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
    disown
    sleep 8
  fi
  sleep 3
done
