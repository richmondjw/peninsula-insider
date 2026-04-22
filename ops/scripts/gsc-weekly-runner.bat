@echo off
:: Peninsula Insider — GSC Weekly Runner
:: Invoked by Windows Task Scheduler every Sunday at 07:00 AEST (21:00 UTC Saturday)
:: Logs output to ops/logs/gsc-YYYY-MM-DD.log

setlocal
set REPO=C:\Users\James\.openclaw\workspace\peninsula-insider
set SCRIPT=%REPO%\ops\scripts\gsc-weekly-report.py
set LOGDIR=%REPO%\ops\logs

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

for /f "tokens=1-3 delims=/" %%a in ("%date%") do set DATESTR=%%c-%%a-%%b
set LOGFILE=%LOGDIR%\gsc-%DATESTR%.log

echo [%date% %time%] Starting GSC weekly report >> "%LOGFILE%"
py "%SCRIPT%" >> "%LOGFILE%" 2>&1
echo [%date% %time%] Done (exit %ERRORLEVEL%) >> "%LOGFILE%"

endlocal
