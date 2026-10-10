param(
  [switch]$ForceDownload
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$required = @(
  ".editorconfig",
  ".gitattributes",
  "AGENTS.md",
  "APP_SPEC.md",
  "app.config.json",
  "dependencies.json",
  "src\index.template.html",
  "build-standalone.ps1",
  "build-standalone.bat",
  "update-ffmpeg.bat",
  "scripts\update-ffmpeg.ps1",
  "scripts\build-self-extract.ps1",
  "scripts\check-source.ps1",
  "scripts\verify-standalone.ps1",
  "scripts\verify-self-extract.ps1",
  "README.md",
  "README.ja.md",
  "SECURITY.md",
  "VERIFY_OFFLINE.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "schemas\app-config.schema.json",
  "schemas\dependencies.schema.json",
  "docs\ARCHITECTURE.md",
  "docs\LLM_WORKFLOW.md",
  "dist\.gitkeep",
  ".github\workflows\build-standalone.yml",
  ".github\workflows\validate.yml",
  ".github\workflows\deploy-pages.yml"
)

foreach ($relative in $required) {
  $path = Join-Path $Root $relative
  if (-not (Test-Path $path)) { throw "Required repository file is missing: $relative" }
}

$selfExtractBuilderPath = Join-Path $Root "scripts\build-self-extract.ps1"
foreach ($byte in [System.IO.File]::ReadAllBytes($selfExtractBuilderPath)) {
  if ($byte -gt 127) {
    throw "scripts\build-self-extract.ps1 must remain ASCII-only for Windows PowerShell 5.1 compatibility."
  }
}

$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if ([string]$app.name -ne "Video Contact Sheet") { throw "app.config.json: unexpected app name" }
if ([string]$app.version -notmatch '^\d+\.\d+\.\d+$') { throw "app.config.json: version must use SemVer format (for example 1.0.1)" }
if ([string]$app.repository.name -ne "htmlapps-video-contact-sheet") { throw "app.config.json: repository name mismatch" }
if ([string]$app.build.output -ne "dist/index.html") { throw "app.config.json: build.output must be dist/index.html" }
if (-not ([bool]$app.build.selfExtract.enabled)) { throw "Self-extract output must be enabled" }

$dependencies = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "dependencies.json") | ConvertFrom-Json
$ffmpegDependency = @($dependencies.dependencies | Where-Object { [string]$_.id -eq "ffmpeg-wasm-builder" })
if ($ffmpegDependency.Count -ne 1) { throw "dependencies.json must contain exactly one ffmpeg-wasm-builder dependency" }
if ([string]$ffmpegDependency[0].source -ne "github-release") { throw "ffmpeg-wasm-builder must use source=github-release" }
if ([string]$ffmpegDependency[0].version -ne "1.3.0") { throw "Video Contact Sheet must pin FFmpeg WASM Builder v1.3.0" }
if ([string]$ffmpegDependency[0].releaseAsset -notmatch 'video-contact-sheet') { throw "releaseAsset must use the video-contact-sheet profile" }
if ([string]$ffmpegDependency[0].releaseAsset -notmatch '\{version\}') { throw "releaseAsset must derive from the single version field" }
if ([string]$ffmpegDependency[0].sourceAsset -notmatch '\{version\}') { throw "sourceAsset must derive from the single version field" }
if ([string]$ffmpegDependency[0].license -notmatch 'LGPL-2\.1-or-later') { throw "dependency must document LGPL-2.1-or-later" }
$ffmpegAssets = @($ffmpegDependency[0].assets)
$coreJsAsset = @($ffmpegAssets | Where-Object { [string]$_.key -eq "core-js" })
$coreWasmAsset = @($ffmpegAssets | Where-Object { [string]$_.key -eq "core-wasm" })
if ($coreJsAsset.Count -ne 1 -or [string]$coreJsAsset[0].path -ne "ffmpeg.js.gz" -or [string]$coreJsAsset[0].compression -ne "gzip") { throw "core-js must use the gzip Release asset" }
if ($coreWasmAsset.Count -ne 1 -or [string]$coreWasmAsset[0].path -ne "ffmpeg.wasm.gz" -or [string]$coreWasmAsset[0].compression -ne "gzip") { throw "core-wasm must use the gzip Release asset" }

$templateText = [System.IO.File]::ReadAllText((Join-Path $Root "src\index.template.html"), [System.Text.Encoding]::UTF8)
if ($templateText -notmatch '<title>Video Contact Sheet</title>') { throw "Visible app name must be Video Contact Sheet" }
if ($templateText -notmatch 'WORKERFS') { throw "Template must use WORKERFS for large input files" }
if ($templateText -notmatch 'videoContactSheetArgs') { throw "Template must use the video-contact-sheet runtime helper" }
if ($templateText -notmatch 'decodePpmOutput') { throw "Template must decode the PPM contact-sheet output" }
if (($templateText -notmatch 'data-count="12"') -or ($templateText -notmatch 'data-count="24"') -or ($templateText -notmatch 'data-count="48"')) { throw "12 / 24 / 48 frame choices are required" }
if ($templateText -notmatch 'id="outputFilename"') { throw "Result area must allow the save filename to be edited" }
if ($templateText -notmatch 'id="fileThumb"') { throw "Selected video card must support a lightweight source thumbnail" }
if ($templateText -notmatch 'createSourceThumbnail') { throw "Source thumbnail extraction logic is required" }
if ($templateText -notmatch 'requestVideoFrameCallback') { throw "Source thumbnail should wait for a decoded browser frame when available" }
if ($templateText -notmatch 'normalizeOutputFilename') { throw "Output filename must normalize PNG/JPEG extensions" }
if ($templateText -notmatch 'id="regenerateDialog"') { throw "Unchanged regeneration must use a confirmation dialog" }
if ($templateText -notmatch 'id="zoomViewer"') { throw "Generated result must provide a full-screen zoom viewer" }
if ($templateText -notmatch 'id="zoomFit"') { throw "Zoom viewer must provide a Fit control" }
if ($templateText -notmatch 'id="zoom100"') { throw "Zoom viewer must provide a 100% control" }
if ($templateText -notmatch "addEventListener\('wheel'") { throw "Zoom viewer must support mouse-wheel zoom" }
if ($templateText -notmatch "pointerdown") { throw "Zoom viewer must support pointer gestures for touch panning/pinch" }
if ($templateText -notmatch 'function generationSignature\(\)') { throw "Generation settings must have an explicit signature" }
if ($templateText -notmatch 'function requestGenerate\(\)') { throw "Generate actions must route through the unchanged-settings confirmation guard" }
if ($templateText -notmatch 'id="appMobileBottomBar"') { throw "Mobile layout must include the fixed bottom page tabs" }
if ($templateText -notmatch 'id="mobileVideo"[^>]*data-mobile-key="video"') { throw "Mobile Video page tab is required" }
if ($templateText -notmatch 'id="mobileFrames"[^>]*data-mobile-key="frames"') { throw "Mobile Frames page tab is required" }
if ($templateText -notmatch 'id="mobileGenerate"[^>]*data-mobile-key="generate"') { throw "Mobile Generate page tab is required" }
if ($templateText -notmatch 'id="mobileResult"[^>]*data-mobile-key="result"') { throw "Mobile Result page tab is required" }
if ($templateText -notmatch 'function setMobilePage\(key\)') { throw "Mobile tabs must switch page state instead of scrolling to sections" }
if ($templateText -notmatch 'body\[data-mobile-page="video"\]') { throw "Mobile page visibility must be driven by data-mobile-page" }
if ($templateText -notmatch 'grid-template-columns:repeat\(var\(--app-mobile-bottom-items,4\),minmax\(0,1fr\)\)') { throw "Mobile bottom bar must reserve four page tabs" }
if ($templateText -match 'state\.file\.arrayBuffer\s*\(') { throw "Template must not copy the full selected input with file.arrayBuffer()" }
if ($templateText -match '__CORE_JS_GZIP_BASE64__|__CORE_WASM_GZIP_BASE64__') { throw "Legacy direct gzip placeholders must not remain" }
if ($templateText -notmatch '__EMBEDDED_ASSET_BUNDLE_JSON__') { throw "Template must use the reference repository asset-bundle build contract" }
if ($templateText -notmatch 'DecompressionStream') { throw "Compact standalone runtime must decompress gzip-packed FFmpeg assets" }
if ($templateText -notmatch 'decodeEmbeddedAsset') { throw "Compact standalone runtime must decode cached embedded assets" }

& (Join-Path $Root "scripts\check-source.ps1")
$buildArguments = @{}
if ($ForceDownload) { $buildArguments.ForceDownload = $true }
& (Join-Path $Root "build-standalone.ps1") @buildArguments

$distOutput = Join-Path $Root "dist\index.html"
$rootOutput = Join-Path $Root "video-contact-sheet.html"
if (-not (Test-Path -LiteralPath $rootOutput)) { throw "Root distribution HTML was not generated: video-contact-sheet.html" }
$distHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $distOutput).Hash
$rootHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $rootOutput).Hash
if ($distHash -ne $rootHash) { throw "video-contact-sheet.html must match dist/index.html" }

$manifestPath = Join-Path $Root "dist\dependency-manifest.json"
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
$resolved = @($manifest.dependencies | Where-Object { [string]$_.id -eq "ffmpeg-wasm-builder" })
if ($resolved.Count -ne 1) { throw "Generated manifest must contain exactly one ffmpeg-wasm-builder dependency" }
if ([string]$resolved[0].version -ne [string]$ffmpegDependency[0].version) { throw "Generated manifest Builder version does not match dependencies.json" }
if ([string]$resolved[0].archiveSha256 -notmatch '^[0-9a-f]{64}$') { throw "Generated manifest must record the verified Release archive SHA-256" }
if ([string]$resolved[0].sourceSha256 -notmatch '^[0-9a-f]{64}$') { throw "Generated manifest must record the corresponding-source SHA-256" }
if ([string]::IsNullOrWhiteSpace([string]$resolved[0].correspondingSourceUrl)) { throw "Generated manifest must record the corresponding-source URL" }

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $previousHtml = $env:CONTACT_SHEET_HTML
  try {
    foreach ($target in @("src\index.template.html", "dist\index.html", "video-contact-sheet.html", "dist\index.self-extract.html")) {
      $env:CONTACT_SHEET_HTML = Join-Path $Root $target
      & $node.Source --test (Join-Path $Root "tests\export.test.cjs") (Join-Path $Root "tests\header.test.cjs") (Join-Path $Root "tests\status-language.test.cjs") (Join-Path $Root "tests\dialog-lifecycle.test.cjs")
      if ($LASTEXITCODE -ne 0) { throw "Runtime regression tests failed for $target" }
    }
  } finally {
    $env:CONTACT_SHEET_HTML = $previousHtml
  }
} else {
  Write-Warning "Node.js is not installed; runtime regression tests were not run. The standalone build does not require Node.js."
}

Write-Host "[OK] Repository check passed." -ForegroundColor Green

& node --test (Join-Path $Root "tests/icon-brand.test.cjs")
if ($LASTEXITCODE -ne 0) { throw "Brand icon regression failed." }
