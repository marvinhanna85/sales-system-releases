param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "",
  [string]$Version = "",
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

function Invoke-Step($Name, $Command, $Arguments) {
  Write-Host ""
  Write-Host "==> $Name"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $Root

$CurrentVersion = (& node -p "require('./package.json').version").Trim()

if ($Version -and $Bump) {
  throw "Use either -Version or -Bump, not both."
}

if ($Version -and $Version -notmatch "^\d+\.\d+\.\d+$") {
  throw "Version '$Version' must use major.minor.patch, for example 1.0.1."
}

if (-not $env:GH_TOKEN) {
  throw "GH_TOKEN is missing. Set it first: `$env:GH_TOKEN='github_token_here'"
}

if ($Version) {
  Invoke-Step "Setting version $Version" "npm.cmd" @("version", $Version, "--no-git-tag-version", "--allow-same-version")
} else {
  if (-not $Bump) {
    $Bump = "patch"
  }
  Invoke-Step "Bumping $Bump version" "npm.cmd" @("version", $Bump, "--no-git-tag-version")
  $Version = (& node -p "require('./package.json').version").Trim()
}

Write-Host "Releasing Sales System $CurrentVersion -> $Version"

if (-not $SkipTests) {
  Invoke-Step "Running tests" "npm.cmd" @("test")
}

Invoke-Step "Building and publishing GitHub release" "npm.cmd" @("run", "dist:publish")

Write-Host ""
Write-Host "Done. Version $Version is published. Installed apps will download it automatically after they check for updates."
