@echo off
node "%~dp0scripts\setup.js" --desktop
if errorlevel 1 pause
