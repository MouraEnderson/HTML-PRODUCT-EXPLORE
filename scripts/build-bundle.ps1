$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$out = Join-Path $root 'assets\js\bom-bundle.js'
$files = @(
  'assets\js\embed-query.js',
  'assets\js\config.js',
  'assets\js\platform\widget-runtime.js',
  'assets\js\platform\platform-bridge.js',
  'assets\js\platform\context.js',
  'assets\js\platform\compass.js',
  'assets\js\platform\waf-bootstrap.js',
  'assets\js\platform\waf-client.js',
  'assets\js\integration\3dx-content-parser.js',
  'assets\js\integration\enovia-api.js',
  'assets\js\integration\search-api.js',
  'assets\js\services\product-search-service.js',
  'assets\js\integration\product-explorer-bridge.js',
  'assets\js\integration\explorer-context.js',
  'assets\js\services\attribute-service.js',
  'assets\js\services\physical-product-service.js',
  'assets\js\services\file-import-service.js',
  'assets\js\services\bom-snapshot.js',
  'assets\js\services\explorer-scanner.js',
  'assets\js\services\bom-orchestrator.js',
  'assets\js\services\bom-service.js',
  'assets\js\processing\bom-normalizer.js',
  'assets\js\processing\metrics-engine.js',
  'assets\js\processing\anomaly-detector.js',
  'assets\js\ui\kpi-cards.js',
  'assets\js\ui\dashboard-theme.js',
  'assets\js\ui\charts-manager.js',
  'assets\js\ui\part-image.js',
  'assets\js\ui\part-preview.js',
  'assets\js\ui\layout-fit.js',
  'assets\js\ui\sync-banner.js',
  'assets\js\ui\filters.js',
  'assets\js\ui\data-table.js',
  'assets\js\ui\explorer-sync-panel.js',
  'assets\js\ui\snapshot-panel.js',
  'assets\js\app.js'
)
$parts = @('/* BOM Analytics bundle snapshot20260601d */')
foreach ($f in $files) {
  $parts += ";/* --- $f --- */"
  $parts += [IO.File]::ReadAllText((Join-Path $root $f))
}
$content = $parts -join "`n"
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($out, $content, $utf8)
$build = 'bom20260602e'
if ($content -match "BUILD:\s*'([^']+)'") { $build = $Matches[1] }
$versioned = Join-Path $root "assets\js\bom-bundle-$build.js"
[IO.File]::WriteAllText($versioned, $content, $utf8)
$buildIdJs = "window.__BOM_BUILD_ID__='$build';"
[IO.File]::WriteAllText((Join-Path $root 'assets\js\build-id.js'), $buildIdJs, $utf8)
Write-Host "OK: $out + bom-bundle-$build.js + build-id.js ($((Get-Item $out).Length) bytes)"
