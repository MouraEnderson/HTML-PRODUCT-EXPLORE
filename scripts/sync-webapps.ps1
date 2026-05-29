$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src = Join-Path $root 'assets'
$dst = Join-Path $root 'webapps\BomAnalytics\assets'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
Copy-Item -Path (Join-Path $root 'index.html') -Destination (Join-Path $root 'webapps\BomAnalytics\index.html') -Force -ErrorAction SilentlyContinue
Write-Host "Synced assets -> webapps/BomAnalytics/assets"
