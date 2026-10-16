# Checks the Canvas cookie bridge and tells you what to do next.
# ASCII-only on purpose: Windows PowerShell reads BOM-less UTF-8 as ANSI, so non-ASCII
# literals break the parser. Keep user-facing Chinese in SKILL.md instead.
#
# Usage (from the skill directory):
#   pwsh -File .\scripts\check-bridge.ps1
#   pwsh -File .\scripts\check-bridge.ps1 -Port 8901 -WarnAfterDays 14

param(
    [int]$Port = 8901,
    [double]$WarnAfterDays = 14
)

$url = "http://127.0.0.1:$Port/bridge-health"

try {
    $health = Invoke-RestMethod -Uri $url -TimeoutSec 20
} catch {
    Write-Host "BRIDGE DOWN - $url did not answer." -ForegroundColor Red
    Write-Host "  reason : $($_.Exception.Message)"
    Write-Host "  fix    : run start-bridge.cmd in the bridge program folder,"
    Write-Host "           or confirm the HKCU Run key 'CanvasCookieBridge' exists."
    exit 2
}

Write-Host "bridge       : $($health.bridge)"
Write-Host "upstream     : $($health.upstream)"
Write-Host "status       : $($health.upstream_status)"
Write-Host "logged in as : $($health.authenticated_as)"
Write-Host "cookie age   : $($health.cookie_age_days) days"

if (-not $health.ok) {
    Write-Host ""
    Write-Host "BRIDGE NOT OK" -ForegroundColor Red
    Write-Host "  message : $($health.message)"
    Write-Host "  fix     : run refresh-cookie.cmd (Edge must be logged into Canvas first)."
    exit 1
}

if ($null -ne $health.cookie_age_days -and [double]$health.cookie_age_days -ge $WarnAfterDays) {
    Write-Host ""
    Write-Host "WARNING - cookie is $($health.cookie_age_days) days old; refresh it soon." -ForegroundColor Yellow
    Write-Host "  fix : refresh-cookie.cmd"
    exit 0
}

Write-Host ""
Write-Host "OK - Canvas reads should work." -ForegroundColor Green
exit 0
