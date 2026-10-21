#!/bin/bash
# HTN Legacy — robust dev server start script
# Menghindari pipeline tee yang menyebabkan proses terbunuh saat shell exit.
cd /home/z/my-project
exec bun x next dev -p 3000 > dev.log 2>&1
