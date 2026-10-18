# Publication de Fire Shox :
#   1. construit l'installateur Windows (dist\FireShox-Setup.exe)
#   2. crée (ou met à jour) la version GitHub v<version> avec l'installateur + latest.yml (mises à jour auto)
#   3. pousse le code sur la branche main et le site public (dossier site\) sur la branche gh-pages
# Usage : powershell -ExecutionPolicy Bypass -File tools\publish.ps1 [-Notes "texte"] [-SkipBuild] [-SiteOnly]
param(
  [string]$Notes = "",
  [switch]$SkipBuild,
  [switch]$SiteOnly
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Gh = "F:\unity\LeVraiGoulot\Tools\gh\bin\gh.exe"
$Repo = "zarkyxxx/fireshox"
Set-Location $Root

$env:ELECTRON_CACHE = "$Root\.cache\electron"
$env:ELECTRON_BUILDER_CACHE = "$Root\.cache\electron-builder"
$env:npm_config_cache = "$Root\.cache\npm"
$env:TEMP = "$Root\.cache\tmp"
$env:TMP = "$Root\.cache\tmp"
New-Item -ItemType Directory -Force $env:TEMP | Out-Null

$version = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
$tag = "v$version"
$token = (& $Gh auth token).Trim()
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
$auth = "http.https://github.com/.extraheader=AUTHORIZATION: basic $b64"
$remote = "https://github.com/$Repo.git"

function Git { & git -c core.autocrlf=false -c $auth @args; if ($LASTEXITCODE -ne 0) { throw "git $args a échoué" } }

if (-not $SiteOnly) {
  if (-not $SkipBuild) {
    Write-Host "== Construction de l'installateur $tag"
    if (Test-Path dist) { [IO.Directory]::Delete("$Root\dist", $true) }
    & npx electron-builder --win nsis --publish never
    if ($LASTEXITCODE -ne 0) { throw "electron-builder a échoué" }
  }
  $files = @("dist\FireShox-Setup.exe", "dist\FireShox-Setup.exe.blockmap", "dist\latest.yml")
  foreach ($f in $files) { if (-not (Test-Path $f)) { throw "Fichier manquant : $f" } }

  Write-Host "== Code source -> branche main"
  if (-not (Test-Path .git)) { & git init -b main | Out-Null }
  & git add -A
  & git -c user.name="Fire Shox" -c user.email="fireshox@users.noreply.github.com" commit -q -m "Fire Shox $version" 2>$null
  Git push -q $remote HEAD:main

  Write-Host "== Version GitHub $tag"
  & $Gh release view $tag --repo $Repo *> $null
  if ($LASTEXITCODE -eq 0) {
    & $Gh release upload $tag @files --repo $Repo --clobber
  } else {
    if (-not $Notes) { $Notes = "Fire Shox $version - télécharger FireShox-Setup.exe ci-dessous." }
    & $Gh release create $tag @files --repo $Repo --title "Fire Shox $version" --notes $Notes --latest
  }
  if ($LASTEXITCODE -ne 0) { throw "Publication de la version impossible" }
}

Write-Host "== Site public -> branche gh-pages"
$tmp = "$Root\.cache\gh-pages"
if (Test-Path $tmp) { [IO.Directory]::Delete($tmp, $true) }
New-Item -ItemType Directory -Force $tmp | Out-Null
Copy-Item "$Root\site\*" $tmp -Recurse -Force
if (-not (Test-Path "$tmp\.nojekyll")) { New-Item -ItemType File "$tmp\.nojekyll" | Out-Null }
Push-Location $tmp
& git init -q -b gh-pages
& git add -A
& git -c user.name="Fire Shox" -c user.email="fireshox@users.noreply.github.com" commit -q -m "Site Fire Shox $version"
Git push -q -f $remote gh-pages
Pop-Location

# Active GitHub Pages sur gh-pages (sans effet si c'est déjà fait)
& $Gh api "repos/$Repo/pages" --silent 2>$null
if ($LASTEXITCODE -ne 0) {
  & $Gh api -X POST "repos/$Repo/pages" -f "source[branch]=gh-pages" -f "source[path]=/" --silent
}
Write-Host "== Terminé : https://zarkyxxx.github.io/fireshox/  et  https://github.com/$Repo/releases/tag/$tag"
