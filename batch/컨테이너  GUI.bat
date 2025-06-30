@echo off
start /b /wait powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0\ps\cleanup-gui-container.ps1"