param(
    [string]$Root = "C:\Void Shop",
    [string]$FrontSub = "frontend",
    [int]$WaitSeconds = 120,
    [string]$ManualUrl = ""
)

# Paths
$root = $Root.TrimEnd('\')
$front = Join-Path $root $FrontSub
$cloudflared = Join-Path $front "cloudflared.exe"
$log = Join-Path $env:TEMP "cloudflared_log.txt"
$envRoot = Join-Path $root ".env"
$envFront = Join-Path $front ".env"

Write-Host "Root: $root"
Write-Host "Frontend: $front"

if (!(Test-Path $cloudflared)) {
    Write-Warning "cloudflared.exe not found at: $cloudflared"
    Write-Warning "Please put cloudflared.exe into the frontend folder or update the path."
}

# Prepare log
if (Test-Path $log) { Remove-Item $log -ErrorAction SilentlyContinue }
New-Item -Path $log -ItemType File -Force | Out-Null

# Start cloudflared in a new PowerShell window and tee output to the log
Write-Host "1) Starting cloudflared in a new window. Log: $log"
$cfCmd = "cd '$front'; & '$cloudflared' tunnel --url http://localhost:5175 2>&1 | Tee-Object -FilePath '$log'"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$cfCmd -WindowStyle Normal

# Get public URL either from ManualUrl or from log
if ($ManualUrl -ne "") {
    $publicUrl = $ManualUrl
    Write-Host "Using ManualUrl: $publicUrl"
} else {
    $pattern = 'https?://[A-Za-z0-9-]+\.trycloudflare\.com'
    $publicUrl = $null
    Write-Host "Waiting for public URL in log (max $WaitSeconds seconds)..."
    for ($i=0; $i -lt $WaitSeconds; $i++) {
        Start-Sleep -Seconds 1
        try {
            $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
        } catch {
            $content = ""
        }
        if ($content -match $pattern) {
            $publicUrl = $matches[0]
            break
        }
    }
    if (-not $publicUrl) {
        Write-Warning "Could not find tunnel URL in log within $WaitSeconds seconds."
        Write-Host "If you have the URL, re-run with -ManualUrl 'https://your-tunnel.trycloudflare.com'"
        exit 1
    } else {
        Write-Host "Found tunnel URL: $publicUrl"
    }
}

# Function: replace in .env (NO BACKUPS)
function ReplaceEnvInPlace($filePath, $newUrl) {
    if (-not (Test-Path $filePath)) {
        Write-Warning ".env not found: $filePath"
        return
    }

    $pattern = 'https?://[A-Za-z0-9-]+\.trycloudflare\.com'
    $content = Get-Content $filePath -Raw

    if ($content -match $pattern) {
        $newContent = $content -replace $pattern, $newUrl
        Set-Content -Path $filePath -Value $newContent -Force
        Write-Host "Replaced trycloudflare URL in $filePath"
    } else {
        $lines = Get-Content $filePath
        $changed = $false
        for ($i=0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^(VITE_API_BASE|BASE_URL|API_BASE)\s*=') {
                $parts = $lines[$i] -split '=', 2
                $key = $parts[0].Trim()
                $lines[$i] = "$key=$newUrl"
                $changed = $true
            }
        }
        if ($changed) {
            $lines | Set-Content -Path $filePath -Force
            Write-Host "Updated VITE_API_BASE/BASE_URL/API_BASE keys in $filePath"
        } else {
            Write-Warning "No trycloudflare URL or known keys found in $filePath. Appending VITE_API_BASE."
            Add-Content -Path $filePath -Value "`nVITE_API_BASE=$newUrl"
            Write-Host "Added VITE_API_BASE=$newUrl to $filePath"
        }
    }
}

# Update .env files (in-place, no backups)
Write-Host "2) Updating .env files (no backups)..."
ReplaceEnvInPlace -filePath $envRoot -newUrl $publicUrl
ReplaceEnvInPlace -filePath $envFront -newUrl $publicUrl

# Start frontend
Write-Host "3) Starting frontend (npm run dev) in a new window..."
$npmCmd = "cd '$front'; npm run dev"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$npmCmd -WindowStyle Normal

# Start backend (uvicorn) in a new window (PowerShell activation)
Write-Host "4) Starting backend (uvicorn) in a new window..."
$activatePs = Join-Path $root ".venv\Scripts\Activate.ps1"
$uvicornCmd = "cd '$root'; if (Test-Path '$activatePs') { . '$activatePs' } else { Write-Warning 'Activate.ps1 not found - check your virtualenv' }; uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000 --log-level info"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$uvicornCmd -WindowStyle Normal

# Start bot_run.py in a new window (activate venv then run python)
Write-Host "5) Starting bot_run.py in a new window..."
$botCmd = "cd '$root'; if (Test-Path '$activatePs') { . '$activatePs' } else { Write-Warning 'Activate.ps1 not found - check your virtualenv' }; python bot_run.py"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$botCmd -WindowStyle Normal

Write-Host "All done. Windows opened:"
Write-Host " - cloudflared (log: $log)"
Write-Host " - frontend (npm run dev)"
Write-Host " - backend (uvicorn)"
Write-Host " - bot (python bot_run.py)"
Write-Host "If Powershell execution policy blocks the script, run once:"
Write-Host "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned"
