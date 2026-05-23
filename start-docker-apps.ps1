# Start Docker Desktop and then bring up the app stack.
# Use this from Windows startup or Task Scheduler.

$dockerDesktopExe = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerDesktopExe)) {
    Write-Error "Docker Desktop executable not found at $dockerDesktopExe. Please install Docker Desktop or update the script path."
    exit 1
}

Write-Output "Starting Docker Desktop..."
Start-Process -FilePath $dockerDesktopExe -WindowStyle Minimized

$maxWaitSeconds = 300
$waitIntervalSeconds = 5
$elapsed = 0
Write-Output "Waiting for Docker daemon to become available..."
while ($true) {
    try {
        docker version --format '{{.Server.Version}}' > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            break
        }
    } catch {
        # ignore errors while waiting
    }

    if ($elapsed -ge $maxWaitSeconds) {
        Write-Error "Docker did not become available within $maxWaitSeconds seconds. Check Docker Desktop manually."
        exit 1
    }

    Start-Sleep -Seconds $waitIntervalSeconds
    $elapsed += $waitIntervalSeconds
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Output "Starting Docker Compose services..."
$composeFile = Join-Path $scriptDir 'docker-compose.local-8080.yml'
if (-not (Test-Path $composeFile)) {
    Write-Error "Compose file not found: $composeFile"
    exit 1
}

docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker Compose stack."
    exit $LASTEXITCODE
}

Write-Output "Docker Desktop started and app services are now running."
