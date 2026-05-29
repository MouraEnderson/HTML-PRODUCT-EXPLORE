$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$out = Join-Path $root 'assets\js\bom-bundle.js'
$files = @(
  'assets\js\config.js',
  'assets\js\platform\widget-runtime.js',
  'assets\js\platform\platform-bridge.js',
  'assets\js\platform\context.js',
  'assets\js\platform\compass.js',
  'assets\js\platform\waf-bootstrap.js',
  'assets\js\platform\waf-client.js',
  'assets\js\integration\3dx-content-parser.js',
  'assets\js\integration\enovia-api.js',
  'assets\js\integration\product-explorer-bridge.js',
  'assets\js\services\attribute-service.js',
  'assets\js\services\physical-product-service.js',
  'assets\js\services\file-import-service.js',
  'assets\js\services\bom-snapshot.js',
  'assets\js\services\explorer-scanner.js',
  'assets\js\services\bom-service.js',
  'assets\js\processing\bom-normalizer.js',
  'assets\js\processing\metrics-engine.js',
  'assets\js\processing\anomaly-detector.js',
  'assets\js\ui\kpi-cards.js',
  'assets\js\ui\charts-manager.js',
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
[IO.File]::WriteAllText($out, ($parts -join "`n"))
Write-Host "OK: $out ($((Get-Item $out).Length) bytes)"
