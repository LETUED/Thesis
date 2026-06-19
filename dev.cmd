@echo off
REM THESIS 개발 런처 래퍼 — `dev up | down | status | restart | logs`
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
