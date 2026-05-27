$ErrorActionPreference = "Stop"

$devPort = 3003
$connection = Get-NetTCPConnection -LocalPort $devPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
  Write-Host "Stopping dev server on port $devPort before Prisma generate..."
  Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

pnpm exec prisma generate
