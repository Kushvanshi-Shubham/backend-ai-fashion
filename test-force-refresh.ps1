# 🧪 Force Re-Extract Testing Script

Write-Host "🔄 Testing Force Re-Extract Feature" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# Test image (small base64 for testing)
$testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Test schema
$schema = @(
    @{
        key = "color"
        label = "Color"
        type = "text"
        required = $true
    }
) | ConvertTo-Json

Write-Host "`n1️⃣ Test 1: First extraction (cache miss)" -ForegroundColor Yellow
$body1 = @{
    image = $testImage
    schema = $schema | ConvertFrom-Json
    categoryName = "T-Shirt"
    forceRefresh = $false
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/extract/base64" `
        -Method POST `
        -Body $body1 `
        -ContentType "application/json"
    
    Write-Host "✅ First extraction complete" -ForegroundColor Green
    Write-Host "   Cached: $($response1.metadata.cached)" -ForegroundColor Gray
    Write-Host "   Model: $($response1.data.modelUsed)" -ForegroundColor Gray
} catch {
    Write-Host "❌ First extraction failed: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

Write-Host "`n2️⃣ Test 2: Second extraction (should use cache)" -ForegroundColor Yellow
$body2 = @{
    image = $testImage
    schema = $schema | ConvertFrom-Json
    categoryName = "T-Shirt"
    forceRefresh = $false
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/extract/base64" `
        -Method POST `
        -Body $body2 `
        -ContentType "application/json"
    
    Write-Host "✅ Second extraction complete" -ForegroundColor Green
    Write-Host "   Cached: $($response2.metadata.cached)" -ForegroundColor Gray
    Write-Host "   Cache Hit: $($response2.metadata.cacheHit)" -ForegroundColor Gray
    
    if ($response2.metadata.cached -eq $true) {
        Write-Host "   🎉 Cache working correctly!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Expected cached result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Second extraction failed: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

Write-Host "`n3️⃣ Test 3: Force re-extract (bypass cache)" -ForegroundColor Yellow
$body3 = @{
    image = $testImage
    schema = $schema | ConvertFrom-Json
    categoryName = "T-Shirt"
    forceRefresh = $true
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/extract/base64" `
        -Method POST `
        -Body $body3 `
        -ContentType "application/json"
    
    Write-Host "✅ Force re-extract complete" -ForegroundColor Green
    Write-Host "   Cached: $($response3.metadata.cached)" -ForegroundColor Gray
    Write-Host "   Force Refresh: $($response3.metadata.forceRefresh)" -ForegroundColor Gray
    
    if ($response3.metadata.cached -eq $false) {
        Write-Host "   🎉 Force refresh working correctly!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Expected fresh extraction" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Force re-extract failed: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 2

Write-Host "`n4️⃣ Test 4: Cache stats" -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/cache/stats" -Method GET
    Write-Host "✅ Cache stats retrieved" -ForegroundColor Green
    Write-Host "   Enabled: $($stats.data.enabled)" -ForegroundColor Gray
    Write-Host "   Connected: $($stats.data.connected)" -ForegroundColor Gray
    Write-Host "   Total Keys: $($stats.data.totalKeys)" -ForegroundColor Gray
    Write-Host "   Memory Usage: $($stats.data.memoryUsage)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Cache stats failed: $_" -ForegroundColor Red
}

Write-Host "`n✨ Testing Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected Results:" -ForegroundColor White
Write-Host "  Test 1: cached=false (first time, cache miss)" -ForegroundColor Gray
Write-Host "  Test 2: cached=true (second time, cache hit)" -ForegroundColor Gray
Write-Host "  Test 3: cached=false + forceRefresh=true (bypass cache)" -ForegroundColor Gray
Write-Host "  Test 4: Cache stats show enabled and connected" -ForegroundColor Gray
