$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

# Kill any stale process holding port 3000 from a previous dev session
foreach ($line in @(netstat -ano)) {
    if ($line -match ':3000\s+\S+\s+LISTENING\s+(\d+)') {
        Write-Host "[frontend] Releasing stale port 3000 (PID $($Matches[1]))"
        taskkill /F /T /PID $Matches[1] 2>&1 | Out-Null
        Start-Sleep -Milliseconds 600
    }
}

Set-Location (Join-Path $repoRoot 'frontend')

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Kill-Port {
    param([int]$Port)
    $seen = @{}
    foreach ($line in @(netstat -ano)) {
        if ($line -match ":${Port}\s+\S+\s+LISTENING\s+(\d+)") {
            $pid = $Matches[1]
            if (-not $seen.ContainsKey($pid)) {
                $seen[$pid] = $true
                Write-Host "[frontend] Releasing stale port ${Port} (PID $pid)"
                $null = cmd /c "taskkill /F /T /PID $pid 2>nul"
            }
        }
    }
    if ($seen.Count -gt 0) { Start-Sleep -Milliseconds 600 }
}

Kill-Port 3000

# When the console is closed the PowerShell engine fires this event before dying
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Kill-Port 3000 }

Set-Location (Join-Path $repoRoot 'frontend')

# Prevent static-export env flags from leaking into local Next.js dev.
if (Test-Path Env:PLATFORM_TARGET) { Remove-Item Env:PLATFORM_TARGET }
if (Test-Path Env:NEXT_PUBLIC_STATIC_LOCALE) { Remove-Item Env:NEXT_PUBLIC_STATIC_LOCALE }

try {
    bun run dev
} finally {
    Kill-Port 3000
}
