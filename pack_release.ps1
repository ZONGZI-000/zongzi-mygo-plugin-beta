# Pack release zip for MyGo plugin.
# Usage:
#   powershell -File pack_release.ps1
#   powershell -File pack_release.ps1 -Version 1.0.0
#   powershell -File pack_release.ps1 -OutDir releases\history -OutName zongzi-music-v1.0.0.zip
param(
  [string]$Version = "",
  [string]$OutDir = "",
  [string]$OutName = "zongzi-music-latest.zip"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = $PSScriptRoot

if (-not $Version) {
  $meta = Get-Content (Join-Path $src "plugin.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $Version = $meta.version
}

if (-not $OutDir) { $OutDir = Join-Path $src "releases\latest" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$outPath = Join-Path $OutDir $OutName
if (Test-Path $outPath) { Remove-Item $outPath -Force }

# WHITELIST: only runtime files ship to users.
# Everything else (dev scripts, tests, debug probes, git metadata) is excluded.
# Add new runtime files here explicitly, so a stray debug script can never leak.
$allowTop = @(
  "index.js",
  "plugin.json",
  "README.md",
  "RELEASING.md",
  "NOTES.md",
  "BANNED_ARTISTS.md",
  "deploy.sh"
)
$allowDir = @("locales")

function ShouldInclude([string]$relPath) {
  $parts = $relPath -split "[\\/]"
  $top = $parts[0]

  if ($parts.Length -eq 1) {
    return ($allowTop -contains $top)
  }
  if ($allowDir -contains $top) { return $true }
  return $false
}

$zip = [System.IO.Compression.ZipFile]::Open($outPath, "Create")
$count = 0
try {
  $files = Get-ChildItem -Path $src -Recurse -File
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($src.Length).TrimStart("\","/")
    if (-not (ShouldInclude $rel)) { continue }

    $entryName = $rel -replace "\\","/"
    $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $es = $entry.Open()
    $fs = [System.IO.File]::OpenRead($f.FullName)
    $fs.CopyTo($es)
    $fs.Dispose()
    $es.Dispose()
    $count++
  }
}
finally {
  $zip.Dispose()
}

Write-Output ("OK version=" + $Version + " files=" + $count + " zip=" + $outPath)
