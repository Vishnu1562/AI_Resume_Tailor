# Package script for AI Resume Tailor Chrome Extension
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $ProjectRoot "release"
$ZipName = "ai-resume-tailor-v$Version.zip"
$ZipPath = Join-Path $ReleaseDir $ZipName

Write-Host "Building project and running tests..." -ForegroundColor Cyan

# 1. Ensure tests pass and project builds
Set-Location $ProjectRoot
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tests failed! Aborting package."
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed! Aborting package."
    exit 1
}

# 2. Ensure release directory exists
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

Write-Host "Creating clean production package: $ZipName" -ForegroundColor Cyan

# 3. Create ZIP with forward slashes for Chrome Web Store & cross-platform compatibility
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipMode = [System.IO.Compression.ZipArchiveMode]::Create
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, $zipMode)

function Add-File($fullPath, $entryName) {
    $cleanEntry = $entryName.Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $cleanEntry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

# Root files
$rootFiles = @("manifest.json", "sidepanel.html", "sidepanel.css")
foreach ($rf in $rootFiles) {
    $fpath = Join-Path $ProjectRoot $rf
    if (Test-Path $fpath) {
        Add-File $fpath $rf
    }
}

# Directories
$dirs = @("dist", "icons", "libs")
foreach ($d in $dirs) {
    $dirPath = Join-Path $ProjectRoot $d
    if (Test-Path $dirPath) {
        Get-ChildItem -Path $dirPath -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($ProjectRoot.Path.Length).TrimStart("\", "/")
            Add-File $_.FullName $rel
        }
    }
}

$zip.Dispose()

$zipSize = (Get-Item $ZipPath).Length / 1KB
Write-Host "Successfully packaged $ZipName ($([Math]::Round($zipSize, 1)) KB)" -ForegroundColor Green
Write-Host "Target location: $ZipPath" -ForegroundColor Green
