@echo off
REM Transcript Vault - Daily Transcript Processor
REM This script processes any new transcripts and exits
REM Schedule this with Windows Task Scheduler to run daily

cd /d "C:\Users\brian\OneDrive\RJO-Documents\.Content\Apps\The Olson Tapes - Transcript Vault\lvs"

REM Log start time
echo [%date% %time%] Starting transcript processing >> logs\watcher.log

REM Run the one-shot processor
call npm run watch:once >> logs\watcher.log 2>&1

REM Log completion
echo [%date% %time%] Processing complete >> logs\watcher.log
echo. >> logs\watcher.log
