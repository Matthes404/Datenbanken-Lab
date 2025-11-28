@echo off
set SCRIPT_DIR=%~dp0
if not exist "%SCRIPT_DIR%parallel-order-test.ps1" (
  echo PowerShell script parallel-order-test.ps1 not found in %SCRIPT_DIR%
  exit /b 1
)
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%parallel-order-test.ps1" --Count 50 %*
