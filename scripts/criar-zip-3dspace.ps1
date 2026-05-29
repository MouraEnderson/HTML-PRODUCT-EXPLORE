$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root
& (Join-Path $PSScriptRoot 'sync-webapps.ps1')
$zip = Join-Path $root 'BomAnalytics-3DSpace.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $root 'webapps\BomAnalytics\*') -DestinationPath $zip -Force
Write-Host ""
Write-Host "ZIP pronto:" -ForegroundColor Green
Write-Host $zip
Write-Host ""
Write-Host "Envie ao admin 3DEXPERIENCE. URL apos publicar:"
Write-Host "https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html"
