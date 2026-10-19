@echo off
setlocal
chcp 65001 >nul
title Publier Pixel Village sur GitHub
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto no_git

git rev-parse --git-dir >nul 2>nul
if errorlevel 1 goto no_repo

git remote get-url origin >nul 2>nul
if not errorlevel 1 goto have_remote

echo.
echo Colle l'URL du depot GitHub, par exemple :
echo   https://github.com/ton-compte/pixel-village
echo.
set /p REPO_URL=URL : 
if "%REPO_URL%"=="" goto no_url
git remote add origin "%REPO_URL%"
if errorlevel 1 goto bad_url

:have_remote
echo.
echo Verification des changements...
git add -A
git diff --cached --quiet
if errorlevel 1 goto commit
echo Aucun changement a envoyer.
goto push

:commit
set /p MESSAGE=Message du commit (Entree pour "Mise a jour du jeu") : 
if "%MESSAGE%"=="" set MESSAGE=Mise a jour du jeu
git commit -m "%MESSAGE%"

:push
echo.
echo Envoi vers GitHub...
git push -u origin main
if errorlevel 1 goto push_failed
echo.
echo Envoye. Si le depot est relie a Render, le redeploiement demarre tout seul.
goto end

:push_failed
echo.
echo Echec de l'envoi. Causes possibles :
echo   - URL du depot incorrecte : git remote set-url origin URL
echo   - connexion GitHub refusee : relance et connecte-toi dans la fenetre
echo   - depot distant deja rempli avec un autre historique
goto end

:no_git
echo Git n'est pas installe. Installe Git for Windows :
echo   https://git-scm.com/download/win
goto end

:no_repo
echo Ce dossier n'est pas encore un depot Git.
echo Lance d'abord : git init -b main
goto end

:no_url
echo Aucune URL fournie, rien n'a ete envoye.
goto end

:bad_url
echo Impossible d'ajouter ce depot distant. Verifie l'URL.

:end
echo.
pause
