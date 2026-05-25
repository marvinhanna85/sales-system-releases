param(
  [string]$Owner = "marvinhanna85",
  [string]$Repo = "sales-system-releases",
  [string]$Branch = "main",
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [string]$Version = "",
  [string]$Message = "",
  [switch]$SkipTests,
  [switch]$DispatchOnly
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

function Get-ReleaseToken {
  $token = $env:GH_TOKEN
  if (-not $token) {
    $token = [Environment]::GetEnvironmentVariable("GH_TOKEN", "User")
  }
  if (-not $token) {
    throw "GH_TOKEN is missing. Store it once with: [Environment]::SetEnvironmentVariable('GH_TOKEN', '<token>', 'User')"
  }
  return $token
}

$Token = Get-ReleaseToken
$Headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-GitHubApi {
  param(
    [ValidateSet("GET", "POST", "PATCH", "PUT")]
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "https://api.github.com/repos/$Owner/$Repo$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers
  }
  $json = $Body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers -ContentType "application/json" -Body $json
}

function Get-LocalReleaseFiles {
  $explicit = @(
    "main.js",
    "preload.js",
    "package.json",
    "package-lock.json",
    "README.md",
    "build-app.bat",
    "release-app.bat",
    "start-app.bat"
  )

  $recursiveDirs = @("scripts", "src", "tests")
  $files = @()

  foreach ($item in $explicit) {
    if (Test-Path $item -PathType Leaf) {
      $files += Get-Item $item
    }
  }

  foreach ($dir in $recursiveDirs) {
    if (Test-Path $dir -PathType Container) {
      $files += Get-ChildItem $dir -Recurse -File
    }
  }

  $files |
    Where-Object {
      $_.FullName -notmatch "\\node_modules\\" -and
      $_.FullName -notmatch "\\release\\" -and
      $_.FullName -notmatch "\\.git\\"
    } |
    Sort-Object FullName -Unique
}

function New-Blob {
  param([byte[]]$Bytes)
  return Invoke-GitHubApi -Method POST -Path "/git/blobs" -Body @{
    content = [Convert]::ToBase64String($Bytes)
    encoding = "base64"
  }
}

function Push-LocalSnapshot {
  $ref = Invoke-GitHubApi -Method GET -Path "/git/ref/heads/$Branch"
  $headSha = $ref.object.sha
  $headCommit = Invoke-GitHubApi -Method GET -Path "/git/commits/$headSha"
  $baseTree = $headCommit.tree.sha
  $treeItems = @()
  $files = Get-LocalReleaseFiles

  foreach ($file in $files) {
    $relative = $file.FullName.Substring($Root.Path.Length + 1).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $blob = New-Blob -Bytes $bytes
    $treeItems += @{
      path = $relative
      mode = "100644"
      type = "blob"
      sha = $blob.sha
    }
  }

  $tree = Invoke-GitHubApi -Method POST -Path "/git/trees" -Body @{
    base_tree = $baseTree
    tree = $treeItems
  }

  $commitMessage = if ($Message) { $Message } else { "Build statistics decision engine" }
  $commit = Invoke-GitHubApi -Method POST -Path "/git/commits" -Body @{
    message = $commitMessage
    tree = $tree.sha
    parents = @($headSha)
  }

  Invoke-GitHubApi -Method PATCH -Path "/git/refs/heads/$Branch" -Body @{
    sha = $commit.sha
    force = $false
  } | Out-Null

  return $commit
}

function Get-ContentEndpointPath {
  param([string]$RelativePath)
  return (($RelativePath -split "/") | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
}

function Get-RemoteFileInfo {
  param([string]$RelativePath)

  $encoded = Get-ContentEndpointPath -RelativePath $RelativePath
  try {
    return Invoke-GitHubApi -Method GET -Path "/contents/$encoded`?ref=$Branch"
  } catch {
    $response = $_.Exception.Response
    if ($response -and [int]$response.StatusCode -eq 404) {
      return $null
    }
    throw
  }
}

function Push-LocalSnapshotWithContentsApi {
  $files = Get-LocalReleaseFiles
  $commitMessage = if ($Message) { $Message } else { "Build statistics decision engine" }
  $changed = 0

  foreach ($file in $files) {
    $relative = $file.FullName.Substring($Root.Path.Length + 1).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = [Convert]::ToBase64String($bytes)
    $remote = Get-RemoteFileInfo -RelativePath $relative
    $remoteContent = if ($remote -and $remote.content) { ($remote.content -replace "\s", "") } else { "" }

    if ($remoteContent -eq $content) {
      continue
    }

    $body = @{
      message = "$commitMessage [skip ci]"
      content = $content
      branch = $Branch
    }
    if ($remote -and $remote.sha) {
      $body.sha = $remote.sha
    }

    $encoded = Get-ContentEndpointPath -RelativePath $relative
    Invoke-GitHubApi -Method PUT -Path "/contents/$encoded" -Body $body | Out-Null
    $changed += 1
    Write-Host "Updated $relative"
  }

  Write-Host "Contents API snapshot complete. Changed files: $changed"
  return @{ changed = $changed }
}

function Start-ReleaseWorkflow {
  $inputs = @{
    bump = $Bump
    version = $Version
    skip_tests = if ($SkipTests) { "true" } else { "false" }
  }
  Invoke-GitHubApi -Method POST -Path "/actions/workflows/release.yml/dispatches" -Body @{
    ref = $Branch
    inputs = $inputs
  } | Out-Null
}

function Wait-ForLatestRun {
  Start-Sleep -Seconds 5
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $runs = Invoke-GitHubApi -Method GET -Path "/actions/workflows/release.yml/runs?branch=$Branch&per_page=5"
    $run = $runs.workflow_runs | Select-Object -First 1
    if ($run) {
      Write-Host "Workflow: $($run.html_url)"
      if ($run.status -eq "completed") {
        if ($run.conclusion -ne "success") {
          throw "Release workflow completed with conclusion: $($run.conclusion)"
        }
        return $run
      }
      Write-Host "Workflow status: $($run.status)"
    }
    Start-Sleep -Seconds 10
  }
  throw "Timed out waiting for release workflow."
}

if ($Version -and $PSBoundParameters.ContainsKey("Bump")) {
  throw "Use either -Version or -Bump, not both."
}

if ($DispatchOnly) {
  Start-ReleaseWorkflow
  $run = Wait-ForLatestRun
  Write-Host "Release workflow finished: $($run.html_url)"
  exit 0
}

try {
  $commit = Push-LocalSnapshot
  Write-Host "Pushed local snapshot to $Owner/$Repo@${Branch}: $($commit.sha)"
  Write-Host "The push will trigger the release workflow automatically."
} catch {
  Write-Host "Git tree API push failed, falling back to Contents API."
  Write-Host $_.Exception.Message
  Push-LocalSnapshotWithContentsApi | Out-Null
  Write-Host "Triggering release workflow manually."
  Start-ReleaseWorkflow
}

$run = Wait-ForLatestRun
Write-Host "Release workflow finished: $($run.html_url)"
