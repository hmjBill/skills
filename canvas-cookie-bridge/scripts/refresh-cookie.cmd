@echo off
rem Re-grab the Canvas session cookie from the daily browser.
rem The browser must be running with --remote-debugging-port (the script
rem prints exact instructions when it is not).
node "%~dp0grab-cookie.mjs"
