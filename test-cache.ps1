# Redis Cache Test Script for PowerShell
# Run: .\test-cache.ps1

Write-Host "`n🔍 Testing Redis Cache System..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"

# Test 1: Check cache health
Write-Host "1️⃣ Checking cache health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/cache/health" -Method GET
    if ($health.data.healthy) {
        Write-Host "   ✅ Cache is healthy and connected" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Cache is not healthy" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed to check health: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get cache stats
Write-Host "`n2️⃣ Getting cache statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/cache/stats" -Method GET
    Write-Host "   📊 Cache Stats:" -ForegroundColor Cyan
    Write-Host "      Enabled: $($stats.data.enabled)" -ForegroundColor White
    Write-Host "      Connected: $($stats.data.connected)" -ForegroundColor White
    Write-Host "      Total Keys: $($stats.data.totalKeys)" -ForegroundColor White
    Write-Host "      Memory Usage: $($stats.data.memoryUsage)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Failed to get stats: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test extraction with caching
Write-Host "`n3️⃣ Testing extraction with cache..." -ForegroundColor Yellow
Write-Host "   📤 Sending first extraction request (should MISS cache)..." -ForegroundColor Cyan

$body = @{
    image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=="
    schema = @(
        @{
            key = "color"
            label = "Color"
            type = "text"
        },
        @{
            key = "size"
            label = "Size"
            type = "text"
        }
    )
    categoryName = "T-Shirt"
} | ConvertTo-Json -Depth 10

try {
    $start1 = Get-Date
    $result1 = Invoke-RestMethod -Uri "$baseUrl/extract/base64" -Method POST -Body $body -ContentType "application/json"
    $elapsed1 = (Get-Date) - $start1
    
    Write-Host "   ⏱️  First request took: $($elapsed1.TotalMilliseconds)ms" -ForegroundColor White
    Write-Host "   📋 Cached: $($result1.metadata.cached)" -ForegroundColor $(if($result1.metadata.cached) { "Green" } else { "Yellow" })
    
    # Wait a moment
    Start-Sleep -Milliseconds 500
    
    Write-Host "`n   📤 Sending second extraction request (should HIT cache)..." -ForegroundColor Cyan
    $start2 = Get-Date
    $result2 = Invoke-RestMethod -Uri "$baseUrl/extract/base64" -Method POST -Body $body -ContentType "application/json"
    $elapsed2 = (Get-Date) - $start2
    
    Write-Host "   ⏱️  Second request took: $($elapsed2.TotalMilliseconds)ms" -ForegroundColor White
    Write-Host "   📋 Cached: $($result2.metadata.cached)" -ForegroundColor $(if($result2.metadata.cached) { "Green" } else { "Red" })
    Write-Host "   🎯 Cache Hit: $($result2.metadata.cacheHit)" -ForegroundColor $(if($result2.metadata.cacheHit) { "Green" } else { "Red" })
    
    # Calculate improvement
    if ($result2.metadata.cached) {
        $improvement = [math]::Round((($elapsed1.TotalMilliseconds - $elapsed2.TotalMilliseconds) / $elapsed1.TotalMilliseconds) * 100, 1)
        Write-Host "`n   ⚡ Speed improvement: $improvement% faster!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "   ❌ Extraction test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check cache stats again
Write-Host "`n4️⃣ Checking cache stats after test..." -ForegroundColor Yellow
try {
    $statsAfter = Invoke-RestMethod -Uri "$baseUrl/cache/stats" -Method GET
    Write-Host "   📊 Total Keys Now: $($statsAfter.data.totalKeys)" -ForegroundColor Cyan
    Write-Host "   💾 Memory Usage: $($statsAfter.data.memoryUsage)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Failed to get updated stats" -ForegroundColor Red
}

# Test 5: Clear cache
Write-Host "`n5️⃣ Clearing cache..." -ForegroundColor Yellow
try {
    $clearResult = Invoke-RestMethod -Uri "$baseUrl/cache/clear" -Method DELETE
    if ($clearResult.success) {
        Write-Host "   ✅ Cache cleared successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Failed to clear cache: $($_.Exception.Message)" -ForegroundColor Red
}

# Final stats
Write-Host "`n6️⃣ Final cache stats..." -ForegroundColor Yellow
try {
    $statsFinal = Invoke-RestMethod -Uri "$baseUrl/cache/stats" -Method GET
    Write-Host "   📊 Total Keys: $($statsFinal.data.totalKeys) (should be 0)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Failed to get final stats" -ForegroundColor Red
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🎉 Cache test complete!`n" -ForegroundColor Green
