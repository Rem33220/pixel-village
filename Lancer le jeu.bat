@echo off
setlocal EnableExtensions
title Pixel Village
cd /d "%~dp0"

echo.
echo   ==========================================
echo    Pixel Village - lancement du jeu
echo   ==========================================
echo.

rem --- 1. Trouver node.exe (npm n'est PAS necessaire) ---------------------
set "NODE_EXE="

where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"

if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%APPDATA%\nvm\node.exe" set "NODE_EXE=%APPDATA%\nvm\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs-lts\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs-lts\current\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs\current\node.exe"

if defined NODE_EXE goto :verify

rem --- 2. Node.js absent : proposer l'installation ------------------------
echo   Node.js n'est pas installe sur cet ordinateur.
echo   (npm n'est pas necessaire : c'est Node.js qui fait tourner le jeu.)
echo.
echo   Je peux l'installer automatiquement avec winget, sans que tu aies
echo   a taper de commande. Rien ne sera installe sans ton accord.
echo.

choice /c ON /n /m "  Installer Node.js maintenant ? [O = oui, N = non] "
if errorlevel 2 goto :manual

where winget >nul 2>nul
if errorlevel 1 goto :noWinget

echo.
echo   Installation de Node.js en cours, cela prend 1 a 3 minutes...
echo.
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :noWinget

set "PATH=%PATH%;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs"

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined NODE_EXE goto :verify

goto :manual

:noWinget
echo.
echo   L'installation automatique n'a pas fonctionne.
echo   Ouverture de la page de telechargement de Node.js...
start "" "https://nodejs.org/fr/download"
echo.
echo   Prends la version "LTS", installe-la en laissant cocher
echo   "Add to PATH", puis relance ce fichier.
echo.
pause
exit /b 1

:manual
echo.
echo   Ouverture de la page de telechargement de Node.js...
start "" "https://nodejs.org/fr/download"
echo.
echo   - Choisis la version "LTS" (bouton Windows Installer .msi).
echo   - Laisse cocher "Add to PATH" pendant l'installation.
echo   - Ferme cette fenetre, puis double-clique a nouveau sur
echo     "Lancer le jeu.bat".
echo.
pause
exit /b 1

rem --- 3. Verifier que le jeu est bien la ---------------------------------
:verify
if not exist "server\index.js" goto :wrongFolder

rem --- 4. Demarrer le serveur et ouvrir le navigateur ---------------------
echo   Node.js trouve. Demarrage du serveur...
echo.
echo   Le navigateur va s'ouvrir tout seul sur http://localhost:3000
echo   Pour arreter le jeu : ferme cette fenetre (ou Ctrl+C).
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

"%NODE_EXE%" server\index.js
set "CODE=%errorlevel%"

echo.
if "%CODE%"=="0" goto :stopped

echo   Le serveur s'est arrete avec le code %CODE%.
echo.
echo   Causes frequentes :
echo   - le port 3000 est deja utilise : ferme l'autre fenetre du jeu,
echo     ou choisis un autre port avec :  set PORT=4000  puis relance.
echo   - un fichier du projet a ete deplace : relance depuis le dossier
echo     qui contient  server\index.js.
echo.
pause
exit /b 1

:stopped
echo   Serveur arrete.
echo.
pause
exit /b 0

:wrongFolder
echo   ERREUR : ce fichier doit rester dans le dossier du jeu,
echo   a cote des dossiers "server" et "public".
echo.
echo   Deplace "Lancer le jeu.bat" dans le dossier Pixel Village, puis reessaie.
echo.
pause
exit /b 1
