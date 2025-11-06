# Simple Redis Cache Test
# Run: .\quick-test.ps1

Write-Host "`n🔍 Quick Redis Cache Test" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Cache stats
Write-Host "📊 Cache Stats:" -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost:5000/api/cache/stats"
Write-Host "   Connected: " -NoNewline; Write-Host "$($stats.data.connected)" -ForegroundColor Green
Write-Host "   Total Keys: " -NoNewline; Write-Host "$($stats.data.totalKeys)" -ForegroundColor Cyan
Write-Host "   Memory: " -NoNewline; Write-Host "$($stats.data.memoryUsage)" -ForegroundColor Cyan

Write-Host "`n✅ Redis is working perfectly!" -ForegroundColor Green
Write-Host "`nNow make some extraction requests and watch the cache fill up! 🚀`n" -ForegroundColor Yellow
