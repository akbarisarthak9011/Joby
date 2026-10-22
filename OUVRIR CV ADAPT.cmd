@echo off
setlocal
title AI CV Adapt
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe ou n'est pas accessible dans le PATH.
  echo Veuillez installer Node.js depuis https://nodejs.org/ puis reessayer.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Installation des dependances...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERREUR] L'installation a echoue.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo Compilation de l'application...
  call npm.cmd run build
)

:: Check if server is already running on port 3016
netstat -ano | findstr ":3016" >nul 2>&1
if errorlevel 1 (
  echo Demarrage du serveur CV Adapt sur http://localhost:3016 ...
  start "CV Adapt Server" /min cmd.exe /c "node server.js"
  timeout /t 2 /nobreak >nul
) else (
  echo Le serveur CV Adapt est deja en cours d'execution sur le port 3016.
)

:: Open in default web browser
start "" "http://localhost:3016/"

endlocal
exit /b 0
