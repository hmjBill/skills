# Read-only health check for a restic repository. Never modifies the repository.
# ASCII-only on purpose: Windows PowerShell reads BOM-less UTF-8 as ANSI, so non-ASCII
# literals break the parser. Keep user-facing Chinese in SKILL.md instead.
#
# Usage (from the skill directory):
#   pwsh -File .\scripts\restic-health.ps1 -Repository 'F:\restic-repo' -PasswordFile 'F:\restic-repo\password.txt'
#   pwsh -File .\scripts\restic-health.ps1 -Repository 'F:\restic-repo' -PasswordFile 'F:\restic-repo\password.txt' -Deep
#
# Exit codes: 0 = healthy, 1 = warnings, 2 = cannot read the repository.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Repository,
    [Parameter(Mandatory = $true)][string]$PasswordFile,
    [string]$Restic = 'restic',
    # A daily backup older than this many hours is reported as stale.
    [int]$StaleAfterHours = 30,
    # Adds an integrity check that also reads pack data (slow, I/O heavy).
    [switch]$Deep,
    # Keep the restic cache off the system drive.
    [string]$CacheDir
)

$ErrorActionPreference = 'Continue'
$warn = 0

function Write-Ok   { param($m) Write-Host "  [ok]   $m" }
function Write-Warn { param($m) Write-Host "  [warn] $m" -ForegroundColor Yellow; $script:warn++ }
function Write-Bad  { param($m) Write-Host "  [BAD]  $m" -ForegroundColor Red }

function Invoke-Restic {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ResticArgs)
    $out = & $Restic @ResticArgs 2>&1
    [PSCustomObject]@{
        Exit = $LASTEXITCODE
        Text = ($out | ForEach-Object { "$_" }) -join "`n"
    }
}

# ---------------------------------------------------------------- environment
Write-Host ""
Write-Host "restic repository health check" -ForegroundColor Cyan
Write-Host "  repo     : $Repository"
Write-Host "  password : $PasswordFile"

$ver = Invoke-Restic 'version'
if ($ver.Exit -ne 0) {
    Write-Bad "cannot run '$Restic' (exit $($ver.Exit)). Is restic installed and on PATH?"
    Write-Host "         Windows install: https://github.com/restic/restic/releases"
    exit 2
}
Write-Ok "restic $($ver.Text.Trim())"

if ($CacheDir) {
    $env:RESTIC_CACHE_DIR = $CacheDir
    Write-Host "  cache    : $CacheDir"
}

# Password must never reach argv or the environment as a value.
if (-not (Test-Path -LiteralPath $PasswordFile)) {
    Write-Bad "password file not found: $PasswordFile"
    exit 2
}
$env:RESTIC_REPOSITORY    = $Repository
$env:RESTIC_PASSWORD_FILE = $PasswordFile

# The password file is the encryption key. If other local users can read it,
# the repository is only as private as that file's ACL.
$acl = Get-Acl -LiteralPath $PasswordFile
$broad = $acl.Access | Where-Object {
    $_.AccessControlType -eq 'Allow' -and
    $_.IdentityReference -match 'BUILTIN\\Users$|Authenticated Users$|Everyone$'
}
if ($broad) {
    Write-Warn "password file is readable by $($broad.IdentityReference -join ', ') - tighten the ACL"
    Write-Host "         icacls `"$PasswordFile`" /inheritance:r /grant:r `"$env:USERNAME`":F"
} else {
    Write-Ok "password file ACL is not world/group readable"
}

# ---------------------------------------------------------------- snapshots
$snapRaw = Invoke-Restic 'snapshots' '--json'
switch ($snapRaw.Exit) {
    0  { }
    10 { Write-Bad "repository does not exist at $Repository"; exit 2 }
    11 { Write-Bad "repository is locked by another restic process"; Write-Host "         check for a running backup, then: restic unlock"; exit 2 }
    12 { Write-Bad "wrong password (exit 12)"; exit 2 }
    default { Write-Bad "restic snapshots failed (exit $($snapRaw.Exit))"; Write-Host $snapRaw.Text; exit 2 }
}

$snaps = $snapRaw.Text | ConvertFrom-Json
$n = @($snaps).Count
Write-Ok "$n snapshot(s) in the repository"
if ($n -eq 0) {
    Write-Bad "no snapshots at all - this is not a backup yet"
    exit 1
}

$newest = ($snaps | Sort-Object { [datetime]$_.time } -Descending)[0]
$ageH = [math]::Round(((Get-Date) - [datetime]$newest.time).TotalHours, 1)
$when = ([datetime]$newest.time).ToString('yyyy-MM-dd HH:mm')
Write-Host "  newest   : $($newest.short_id)  $when  ($ageH h ago)  [$($newest.paths.Count) paths]"
if ($ageH -gt $StaleAfterHours) {
    Write-Warn "newest snapshot is $ageH h old (threshold ${StaleAfterHours}h) - the backup job is not running or is failing"
} else {
    Write-Ok "backup is current"
}

# ---------------------------------------------------------------- retention grouping
# restic applies --keep-* policies per group. With the default --group-by host,paths,
# every change to the backed-up path list opens a NEW group, and each group keeps its
# own full set. Retention then stops reclaiming anything. Grouping by tags is stable.
# @() matters: when a grouping collapses to exactly one group, Group-Object returns a
# bare GroupInfo whose .Count is the number of MEMBERS, not the number of groups.
$byPaths = @($snaps | Group-Object { "$($_.hostname)||" + (($_.paths | Sort-Object) -join '|') })
$byTags  = @($snaps | Group-Object { "$($_.hostname)||" + (($_.tags  | Sort-Object) -join '|') })
Write-Host "  groups   : $($byPaths.Count) by host+paths (restic default), $($byTags.Count) by host+tags"
if ($byPaths.Count -gt 1 -and $byPaths.Count -gt $byTags.Count) {
    Write-Warn "default --group-by host,paths split $($byPaths.Count) snapshots into $($byPaths.Count) groups," 
    Write-Host "         so --keep-daily/-weekly/-monthly apply per group and will barely delete anything."
    Write-Host "         Fix: forget --group-by host,tags (pair it with --keep-tag if snapshots carry tags)."
}

# ---------------------------------------------------------------- size
if ($Deep) {
    $st = Invoke-Restic 'stats' '--mode' 'raw-data'
    if ($st.Exit -eq 0) {
        ($st.Text -split "`n" | Where-Object { $_ -match 'Total Size|Total Uncompressed|Compression Ratio|Snapshots processed' }) |
            ForEach-Object { Write-Host "  $_".TrimEnd() }
    } else {
        Write-Warn "stats failed (exit $($st.Exit))"
    }
} else {
    Write-Host "  size     : (skipped, pass -Deep to measure; stats walks every snapshot)"
}

# ---------------------------------------------------------------- integrity
$checkArgs = @('check')
if ($Deep) { $checkArgs += '--read-data-subset=5%' } else { $checkArgs += '--read-data-subset=1/50' }
$chk = Invoke-Restic @checkArgs
if ($chk.Exit -eq 0) {
    Write-Ok "integrity check passed ($($checkArgs -join ' '))"
} else {
    Write-Bad "integrity check FAILED (exit $($chk.Exit)) - see output below"
    Write-Host $chk.Text
    Write-Host "         Repair ladder: restic repair index -> restic repair packs -> restic check --read-data"
    exit 1
}

# ---------------------------------------------------------------- local repo extras
$isLocal = $Repository -match '^[A-Za-z]:[\\/]' -or $Repository.StartsWith('/')
if ($isLocal) {
    $root = [IO.Path]::GetPathRoot((Resolve-Path -LiteralPath $Repository).Path)
    $drive = Get-PSDrive -Name $root.TrimEnd('\','/') -ErrorAction SilentlyContinue
    if ($drive) {
        $freeGB = [math]::Round($drive.Free / 1GB, 1)
        Write-Host "  volume   : $root  $([math]::Round($drive.Used/1GB,1)) GB used, $freeGB GB free"
        if ($drive.Free -lt 20GB) { Write-Warn "less than 20 GB free on the repository volume" }
    }

    # Stale locks survive a hard kill and block every later run.
    $lockDir = Join-Path $Repository 'locks'
    if (Test-Path -LiteralPath $lockDir) {
        $locks = @(Get-ChildItem -LiteralPath $lockDir -File -ErrorAction SilentlyContinue)
        if ($locks.Count -gt 0) {
            Write-Host "  locks    : $($locks.Count) lock file(s) present"
            $stale = $locks | Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-1) }
            if ($stale) {
                Write-Warn "$($stale.Count) lock(s) older than 1h - a previous run was killed"
                Write-Host "         verify no restic is running, then: restic unlock"
            }
        }
    }
    Write-Host "  note     : a local repository on the same machine protects against accidental"
    Write-Host "             deletion, not against losing the machine. Add a second repository"
    Write-Host "             (S3/B2/SFTP/rest-server) via: restic copy"
}

Write-Host ""
if ($warn -gt 0) {
    Write-Host "DONE with $warn warning(s) - repository is readable, but see the [warn] lines." -ForegroundColor Yellow
    exit 1
}
Write-Host "OK - repository is healthy." -ForegroundColor Green
exit 0
