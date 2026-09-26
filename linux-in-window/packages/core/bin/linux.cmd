@echo off
rem Linux in Window CLI launcher (Windows)
setlocal
set "LIW_ROOT=%~dp0..\..\.."
if not defined LIW_HOME set "LIW_HOME=%LOCALAPPDATA%\linux"
node "%LIW_ROOT%\packages\cli\src\index.js" %*
endlocal
