# Stores an SSH key pair in Bitwarden as a NATIVE sshKey vault item (cipher type 5).
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI and
# non-ASCII literals would break the parser. User-facing Chinese lives in SKILL.md.
#
# Requires a valid BW_SESSION. On Windows persist it with:
#   [Environment]::SetEnvironmentVariable('BW_SESSION', (bw unlock --raw), 'User')
# On macOS / Linux put `export BW_SESSION=...` in the shell profile.
#
# Usage (from the skill directory):
#   pwsh -File .\scripts\store-ssh-key.ps1 -PrivateKeyPath ~/.ssh/id_ed25519
#   pwsh -File .\scripts\store-ssh-key.ps1 -PrivateKeyPath ~/.ssh/id_ed25519 -NoteName ssh-key-work
#
# Optional -BwtAppDataDir overrides the Bitwarden CLI data directory; it is left to
# the caller's environment on purpose so this script stays machine-independent.
#
# WHY type 5 AND NOT A SECURE NOTE:
#   The CLI has supported the sshKey cipher type since 2024.12.0, even though
#   `bw get template item.sshKey` still reports it as unsupported. The template
#   registry lags the cipher types - do not read that as "unsupported".
#
# SCHEMA:
#   { "name": "...", "type": 5,
#     "sshKey": { "privateKey": "...", "publicKey": "...", "keyFingerprint": "SHA256:..." } }
#   The fingerprint field is keyFingerprint - NOT keyType / keyData. publicKey and
#   keyFingerprint are derivable from the private key and may be absent at rest; we
#   write all three so the item is self-describing.
#
# The private key is never printed. Verification compares values without echoing.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$PrivateKeyPath,
    [string]$PublicKeyPath,
    [string]$NoteName,
    [string]$BwtAppDataDir = $env:BITWARDENCLI_APPDATA_DIR
)

$ErrorActionPreference = 'Stop'

function Write-Step { param($m) Write-Host "  $m" }

# ---------------------------------------------------------------- session gate
# Read the session from the persistent store rather than trusting the process
# environment: a child process inherits its parent's (possibly stale) block, so a
# session persisted minutes ago is invisible to a shell that started earlier.
$session = ''
if ($IsWindows) {
    $stored = (Get-ItemProperty 'HKCU:\Environment' -ErrorAction SilentlyContinue).BW_SESSION
    if ($stored) { $session = ([string]$stored).Trim() }
}
if ([string]::IsNullOrWhiteSpace($session)) { $session = ([string]$env:BW_SESSION).Trim() }

if ([string]::IsNullOrWhiteSpace($session)) {
    Write-Host 'No BW_SESSION available.' -ForegroundColor Red
    Write-Host '  Windows  : [Environment]::SetEnvironmentVariable(''BW_SESSION'', (bw unlock --raw), ''User'')'
    Write-Host '  macOS/Lin: export BW_SESSION=$(bw unlock --raw)'
    exit 1
}
$env:BW_SESSION = $session
if ($BwtAppDataDir) { $env:BITWARDENCLI_APPDATA_DIR = $BwtAppDataDir }

$check = & bw unlock --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vault is not unlocked (bw unlock --check failed)." -ForegroundColor Red
    Write-Host '  A persisted BW_SESSION goes stale every time `bw unlock` runs, because'
    Write-Host '  unlocking invalidates all previous session keys. Unlock once, then persist again.'
    Write-Host "  detail: $check"
    exit 1
}

# ---------------------------------------------------------------- read + validate
if (-not (Test-Path -LiteralPath $PrivateKeyPath)) {
    Write-Host "Not found: $PrivateKeyPath" -ForegroundColor Red
    exit 1
}
if (-not $PublicKeyPath) { $PublicKeyPath = "$PrivateKeyPath.pub" }
if (-not $NoteName) { $NoteName = 'ssh-key-' + [IO.Path]::GetFileNameWithoutExtension($PrivateKeyPath) }

# OpenSSH rejects CRLF private keys, so refuse rather than store an unusable entry.
$bytes = [IO.File]::ReadAllBytes($PrivateKeyPath)
for ($i = 1; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -eq 10 -and $bytes[$i - 1] -eq 13) {
        Write-Host 'Key uses CRLF line endings; OpenSSH would refuse to load it.' -ForegroundColor Red
        Write-Host '  Convert first, e.g. dos2unix, then re-run.'
        exit 1
    }
}
$priv = [Text.Encoding]::UTF8.GetString($bytes).Trim()
if ($priv -notmatch '-----BEGIN (OPENSSH|RSA|EC|DSA) PRIVATE KEY-----') {
    Write-Host 'Not a recognizable private key.' -ForegroundColor Red
    exit 1
}
Write-Step "read private key: $($bytes.Length) bytes, LF endings (content not shown)"

$pub = ''
if (Test-Path -LiteralPath $PublicKeyPath) { $pub = (Get-Content -LiteralPath $PublicKeyPath -Raw).Trim() }
$fp = ''
if (Test-Path -LiteralPath $PublicKeyPath) {
    $line = & ssh-keygen -l -f $PublicKeyPath -E sha256 2>$null
    if ($line) { $fp = (($line -split '\s+')[1]).Trim() }
}
Write-Step "public key fingerprint: $fp"

$payload = [PSCustomObject]@{
    name   = $NoteName
    type   = 5
    sshKey = [PSCustomObject]@{
        privateKey     = $priv
        publicKey      = $pub
        keyFingerprint = $fp
    }
} | ConvertTo-Json -Depth 10 -Compress

# Replace any earlier copy so re-running never leaves duplicates behind.
$existingRaw = & bw list items --search $NoteName 2>$null | Out-String
$existing = (($existingRaw -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', '') | ConvertFrom-Json) |
            Where-Object { $_.name -eq $NoteName }
foreach ($old in @($existing)) {
    if ($old) {
        & bw delete item $old.id --permanent 2>&1 | Out-Null
        Write-Step "removed previous copy (cipher type $($old.type), id $($old.id))"
    }
}

# Pass the encoded payload via a temp file so the secret never appears in argv.
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("bw-sshkey-" + [guid]::NewGuid().ToString('N') + '.b64')
try {
    [IO.File]::WriteAllText($tmp, ($payload | & bw encode).Trim())
    $result = & bw create item (Get-Content $tmp -Raw) 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Host "create FAILED: $result" -ForegroundColor Red
        exit 1
    }
} finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
$id = ($result | ConvertFrom-Json).id
& bw sync 2>&1 | Out-Null

# ---------------------------------------------------------------- verify
$item = (((& bw get item $id 2>$null | Out-String) -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', '') | ConvertFrom-Json)
if (-not $item) { Write-Host 'verification FAILED: item not readable after write' -ForegroundColor Red; exit 1 }
$stored = ([string]$item.sshKey.privateKey).Trim()

$okType    = ($item.type -eq 5)
$okPriv    = ($stored -ceq $priv)
$okPub     = $true
$okFp      = $true
if ($pub) { $okPub = (([string]$item.sshKey.publicKey).Trim() -ceq $pub) }
if ($fp)  { $okFp  = (([string]$item.sshKey.keyFingerprint).Trim() -ceq $fp) }

Write-Host ''
Write-Step "stored cipher type = $($item.type)   (5 = SshKey)"
Write-Step "privateKey  byte-match = $okPriv"
Write-Step "publicKey   byte-match = $okPub"
Write-Step "fingerprint byte-match = $okFp"

# Derive a public key FROM the stored private key - the strongest available proof.
# Only valid for passphrase-less keys: `ssh-keygen -y -P ''` cannot supply a passphrase
# non-interactively. Report "skipped" rather than implying success.
$probe = Join-Path ([IO.Path]::GetTempPath()) ("bw-verify-" + [guid]::NewGuid().ToString('N') + '.key')
try {
    [IO.File]::WriteAllText($probe, $stored + "`n")
    $null = & ssh-keygen -y -P '' -f $probe 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Step 'stored key derives a public key = ok (key is passphrase-less)'
        if ($pub) { Write-Step "derived pubkey == stored pubkey = $(((& ssh-keygen -y -P '' -f $probe 2>$null) -join '').Trim() -ceq $pub)" }
    } else {
        Write-Step 'derivation check SKIPPED - key has a passphrase; byte-match only'
    }
} finally {
    Remove-Item $probe -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Step "item id : $id"
Write-Step "name    : $NoteName"
Write-Step 'restore : bw get item <id> > ~/.ssh/id_ed25519, then restore strict file permissions'

if (-not ($okType -and $okPriv -and $okPub -and $okFp)) {
    Write-Host ''
    Write-Host 'VERIFICATION FAILED - treat this entry as untrusted.' -ForegroundColor Red
    exit 1
}
Write-Host ''
Write-Host 'OK' -ForegroundColor Green
exit 0
