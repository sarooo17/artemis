# Mock Fluentis Server - Quick Test Script

Write-Host "🧪 Testing Mock Fluentis Server..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n📊 Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/health" -Method GET
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: Export Customers (with Basic Auth)
Write-Host "`n📊 Test 2: Export Customers" -ForegroundColor Yellow
$username = "mock-user"
$password = "mock-password"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))

$headers = @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type" = "application/json"
}

$body = @{
    CompanyId = 1
    DepartmentId = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/export/ExportCustomers" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Export customers passed!" -ForegroundColor Green
    Write-Host "Total customers: $($response.totalRecords)"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Export customers failed: $_" -ForegroundColor Red
}

# Test 3: Get Stock Summary
Write-Host "`n📊 Test 3: Get Stock Summary for ITEM001" -ForegroundColor Yellow
$body2 = @{
    CompanyId = 1
    DepartmentId = 1
    itemCode = "ITEM001"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/service/GetStockSummary" -Method POST -Headers $headers -Body $body2
    Write-Host "✅ Get stock summary passed!" -ForegroundColor Green
    Write-Host "Item: $($response.description)"
    Write-Host "Total Quantity: $($response.totalQuantity)"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Get stock summary failed: $_" -ForegroundColor Red
}

Write-Host "`n✨ Tests completed!" -ForegroundColor Cyan
