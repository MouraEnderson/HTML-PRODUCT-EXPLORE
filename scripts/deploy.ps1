# One-click: bump BUILD -> bundle -> commit -> push (GitHub Pages)
param(
  [string]$Message = "",
  [switch]$NoPush,
  [switch]$NoBump
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Join-Path $root "assets\js\config.js"
$widgetPath = Join-Path $root "widget-v2.html"
$buildScript = Join-Path $root "scripts\build-bundle.ps1"

function Get-CurrentBuild {
  $cfg = Get-Content $configPath -Raw
  if ($cfg -match "BUILD:\s*'([^']+)'") { return $Matches[1] }
  throw "BUILD not found in config.js"
}

function Get-NextBuild([string]$Current) {
  if ($Current -match '^bom(\d{8})([a-z]?)$') {
    $date = $Matches[1]
    $suffix = $Matches[2]
    if (-not $suffix) { return "bom${date}a" }
    $code = [int][char]$suffix
    if ($code -ge [int][char]'z') {
      throw "Build suffix exhausted for bom$date (max z)."
    }
    return "bom$date" + [char]($code + 1)
  }
  $today = Get-Date -Format "yyyyMMdd"
  return "bom${today}a"
}

function Set-BuildId([string]$Build) {
  $cfg = Get-Content $configPath -Raw
  $cfg = $cfg -replace "BUILD:\s*'[^']+'", "BUILD: '$Build'"
  [IO.File]::WriteAllText($configPath, $cfg)

  $widget = Get-Content $widgetPath -Raw
  $widget = $widget -replace "var BOM_BUILD = '[^']+'", "var BOM_BUILD = '$Build'"
  [IO.File]::WriteAllText($widgetPath, $widget)
}

Push-Location $root
try {
  $prev = Get-CurrentBuild
  $build = if ($NoBump) { $prev } else { Get-NextBuild $prev }

  if (-not $NoBump -and $build -ne $prev) {
    Write-Host "BUILD: $prev -> $build"
    Set-BuildId $build
  } else {
    Write-Host "BUILD: $build (unchanged)"
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript
  if ($LASTEXITCODE -ne 0) { throw "build-bundle.ps1 failed" }

  $bundleFile = Join-Path $root "assets\js\bom-bundle-$build.js"
  if (-not (Test-Path $bundleFile)) { throw "Missing $bundleFile" }

  $commitMsg = if ($Message) { $Message } else { "Deploy build $build." }

  git add assets/js/config.js assets/js/build-id.js assets/js/bom-bundle.js `
    assets/js/bom-bundle-$build.js widget-v2.html `
    assets/js/integration/enovia-api.js `
    assets/js/integration/explorer-context.js `
    assets/js/services/bom-service.js `
    assets/js/services/bom-orchestrator.js `
    assets/js/services/api-bom-loader.js `
    assets/js/services/tsv-bom-loader.js `
    assets/js/services/paste-bom-loader.js `
    assets/js/services/explorer-scanner.js `
    assets/js/ui/sync-banner.js assets/js/app.js `
    scripts/build-bundle.ps1 scripts/deploy.ps1 2>$null

  git add -u assets/js/config.js assets/js/build-id.js assets/js/bom-bundle.js widget-v2.html
  git add assets/js/bom-bundle-$build.js

  $status = git status --porcelain
  if (-not $status) {
    Write-Host "Nothing to commit."
    exit 0
  }

  $env:GIT_AUTHOR_NAME = "MouraEnderson"
  $env:GIT_AUTHOR_EMAIL = "mouraenderson@users.noreply.github.com"
  $env:GIT_COMMITTER_NAME = $env:GIT_AUTHOR_NAME
  $env:GIT_COMMITTER_EMAIL = $env:GIT_AUTHOR_EMAIL

  git commit -m $commitMsg
  Write-Host "Committed: $build"

  if (-not $NoPush) {
    git push
    Write-Host "Pushed. Pages: https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=$build"
  } else {
    Write-Host "Skip push (-NoPush). Test: widget-v2.html?v=$build"
  }
}
finally {
  Pop-Location
}
