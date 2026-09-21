<#
.SYNOPSIS
  Install the Approval-Gated Orchestrator plugin for Claude Code.

.DESCRIPTION
  Checks prerequisites, adds this repository as a Claude Code plugin marketplace,
  installs the plugin, and reports which ACP agents (Devin, OpenCode, Cursor) are
  available. It never installs or configures the agent CLIs themselves.

.EXAMPLE
  # From a clone of the repository
  ./install.ps1 -Local

.EXAMPLE
  # From GitHub
  ./install.ps1
#>
param(
  [string]$Source = 'fabricefoy/approval-gated-orchestrator-plugin',
  [switch]$Local,
  [ValidateSet('user', 'project', 'local')][string]$Scope = 'user',
  [switch]$Handshake
)

$ErrorActionPreference = 'Stop'
$Marketplace = 'approval-gated-orchestrator'
$Plugin = "approval-gated-orchestrator@$Marketplace"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "error: $msg" -ForegroundColor Red; exit 1 }

Step 'Checking prerequisites'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail 'Node.js 20+ is required (https://nodejs.org).' }
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { Fail "Node.js 20+ is required; found $(node --version)." }
Write-Host "node $(node --version)"
if (Get-Command git -ErrorAction SilentlyContinue) { git --version } else { Write-Host 'warning: git not found; worktree isolation will be unavailable.' -ForegroundColor Yellow }
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Fail 'Claude Code CLI (claude) is required.' }
Write-Host "claude $(claude --version)"

if ($Local) {
  $Source = $PSScriptRoot
  # Claude Code refuses local marketplaces on network locations (UNC paths, mapped network
  # drives) unless they are declared in settings. Stage a copy on local disk instead.
  $isNetwork = $Source.StartsWith('\\') -or ([System.IO.DriveInfo]::new([System.IO.Path]::GetPathRoot($Source)).DriveType -eq 'Network')
  if ($isNetwork) {
    $staged = Join-Path $env:LOCALAPPDATA 'approval-gated-orchestrator\marketplace'
    Write-Host "Source is on a network location; staging a local copy at $staged"
    if (Test-Path $staged) { Remove-Item -Recurse -Force $staged }
    New-Item -ItemType Directory -Force $staged | Out-Null
    Get-ChildItem -Force $Source | Where-Object Name -ne '.git' | Copy-Item -Destination $staged -Recurse -Force
    $Source = $staged
  }
}

Step "Adding marketplace '$Marketplace' from $Source"
$known = (claude plugin marketplace list 2>&1 | Out-String)
if ($known -match [regex]::Escape($Marketplace)) {
  Write-Host 'Marketplace already added; updating it.'
  claude plugin marketplace update $Marketplace
} else {
  claude plugin marketplace add $Source
}
if ($LASTEXITCODE -ne 0) { Fail 'could not add or update the marketplace.' }

if ((claude plugin list 2>&1 | Out-String) -match [regex]::Escape($Plugin)) {
  Step "Updating $Plugin"
  claude plugin update $Plugin
  if ($LASTEXITCODE -ne 0) { Fail 'plugin update failed.' }
} else {
  Step "Installing $Plugin (scope: $Scope)"
  claude plugin install $Plugin --scope $Scope
  if ($LASTEXITCODE -ne 0) { Fail 'plugin install failed.' }
}

Step 'Checking ACP agents'
$bridge = Join-Path $PSScriptRoot 'plugins/claude-code/scripts/acp.mjs'
if (Test-Path $bridge) {
  $doctorArgs = @('doctor'); if ($Handshake) { $doctorArgs += '--handshake' }
  node $bridge @doctorArgs
  if ($LASTEXITCODE -ne 0) { Write-Host 'Some checks failed. Missing agents are optional; install the ones you want to use.' -ForegroundColor Yellow }
} else {
  Write-Host 'Run /approval-gated-orchestrator:setup in Claude Code to check agents.'
}

Step 'Done'
Write-Host @"
Start a new Claude Code session, then:
  /approval-gated-orchestrator:orchestrate <goal>   plan, route, and dispatch a bounded task
  /approval-gated-orchestrator:setup                check or set up Devin, OpenCode and Cursor
Agent CLIs (optional, each with its own login and billing):
  Devin     docs.devin.ai        OpenCode  opencode.ai/docs        Cursor CLI  cursor.com/cli
"@
