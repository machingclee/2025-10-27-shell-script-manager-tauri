# PowerShell script to download and extract JRE for Windows
# This uses Amazon Corretto 17 which is free and production-ready

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$JreDir = Join-Path $ScriptDir "jre"

Write-Host "Script Directory: $ScriptDir"
Write-Host "JRE Directory: $JreDir"

# Detect architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
Write-Host "Detected Architecture: $Arch"

# Clean up existing JRE
if (Test-Path $JreDir) {
    Write-Host "Removing existing JRE directory..."
    Remove-Item -Recurse -Force $JreDir
}

New-Item -ItemType Directory -Path $JreDir | Out-Null

if ($Arch -eq "x64") {
    Write-Host "Downloading Amazon Corretto 17 JRE for Windows x64..."
    $JreUrl = "https://corretto.aws/downloads/latest/amazon-corretto-17-x64-windows-jdk.zip"
} else {
    Write-Host "ERROR: 32-bit Windows is not supported"
    exit 1
}

$JreZip = Join-Path $JreDir "jre.zip"

Write-Host "Downloading from: $JreUrl"
Invoke-WebRequest -Uri $JreUrl -OutFile $JreZip

Write-Host "Extracting JRE..."
Expand-Archive -Path $JreZip -DestinationPath $JreDir -Force

# Find the extracted directory (it will have a version number)
$ExtractedDir = Get-ChildItem -Path $JreDir -Directory | Where-Object { $_.Name -like "jdk*" } | Select-Object -First 1

if ($ExtractedDir) {
    # Move contents to jre directory root
    Get-ChildItem -Path $ExtractedDir.FullName | Move-Item -Destination $JreDir -Force
    Remove-Item -Path $ExtractedDir.FullName -Recurse -Force
}

Remove-Item -Path $JreZip

Write-Host ""
Write-Host "JRE downloaded and extracted successfully for Windows"
Write-Host "JRE is ready at: $JreDir"
Write-Host "You can now build the production Tauri app"

