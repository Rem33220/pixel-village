@echo off
setlocal
chcp 65001 >nul
title Publier Pixel Village sur le jeu officiel
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto no_node

where git >nul 2>nul
if errorlevel 1 goto no_git

echo.
echo   ==========================================
echo    Pixel Village - publication officielle
echo   ==========================================
echo.
echo   Contrôles, tests, commit puis envoi vers GitHub.
echo   Render redéploie ensuite tout seul.
echo.

set /p MESSAGE=Message du commit (Entree pour "Mise a jour du jeu") : 
if "%MESSAGE%"=="" set "MESSAGE=Mise a jour du jeu"

echo.
node tools\publier.mjs "%MESSAGE%"
set "CODE=%errorlevel%"

echo.
if not "%CODE%"=="0" (
  echo La publication a echoue : le jeu officiel n'a pas change.
  echo Corrige le probleme indique ci-dessus, puis relance ce fichier.
)
pause
exit /b %CODE%

:no_node
echo.
echo   Node.js n'est pas installe : la publication en a besoin.
echo   Installe la version LTS depuis https://nodejs.org/fr/download
echo   (laisse cocher "Add to PATH"), puis relance ce fichier.
echo.
pause
exit /b 1

:no_git
echo.
echo   Git n'est pas installe : impossible d'envoyer vers GitHub.
echo   Installe Git for Windows depuis https://git-scm.com/download/win
echo   puis relance ce fichier.
echo.
pause
exit /b 1
