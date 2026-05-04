param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "",
  [string]$Version = "",
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

function Read-JsonFile($Path) {
  Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile($Path, $Value) {
  $Json = $Value | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $Path -Value ($Json + "`n") -Encoding UTF8
}

function Get-NextVersion($Current, $BumpType) {
  $Parts = $Current.Split(".")
  if ($Parts.Count -ne 3) {
    throw "Version '$Current' must use major.minor.patch."
  }

  $Major = [int]$Parts[0]
  $Minor = [int]$Parts[1]
  $Patch = [int]$Parts[2]

  switch ($BumpType) {
    "major" { return "$($Major + 1).0.0" }
    "minor" { return "$Major.$($Minor + 1).0" }
    "patch" { return "$Major.$Minor.$($Patch + 1)" }
  }
}

function Invoke-Step($Name, $Command, $Arguments) {
  Write-Host ""
  Write-Host "==> $Name"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PackagePath = Join-Path $Root "package.json"
$LockPath = Join-Path $Root "package-lock.json"

Set-Location $Root

$Package = Read-JsonFile $PackagePath
$CurrentVersion = $Package.version

if ($Version -and $Bump) {
  throw "Use either -Version or -Bump, not both."
}

if (-not $Version) {
  if (-not $Bump) {
    $Bump = "patch"
  }
  $Version = Get-NextVersion $CurrentVersion $Bump
}

if ($Version -notmatch "^\d+\.\d+\.\d+$") {
  throw "Version '$Version' must use major.minor.patch, for example 1.0.1."
}

if (-not $env:GH_TOKEN) {
  throw "GH_TOKEN is missing. Set it first: `$env:GH_TOKEN='github_token_here'"
}

Write-Host "Releasing Sales System $CurrentVersion -> $Version"

$Package.version = $Version
Write-JsonFile $PackagePath $Package

if (Test-Path -LiteralPath $LockPath) {
  $Lock = Read-JsonFile $LockPath
  $Lock.version = $Version
  if ($Lock.packages -and $Lock.packages.PSObject.Properties.Name -contains "") {
    $Lock.packages.PSObject.Properties[""].Value.version = $Version
  }
  Write-JsonFile $LockPath $Lock
}

if (-not $SkipTests) {
  Invoke-Step "Running tests" "npm.cmd" @("test")
}

Invoke-Step "Building and publishing GitHub release" "npm.cmd" @("run", "dist:publish")

Write-Host ""
Write-Host "Done. Version $Version is published. Installed apps will download it automatically after they check for updates."
