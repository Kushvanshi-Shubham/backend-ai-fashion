# ============================================
# 🚀 DATABASE QUICK SETUP SCRIPT
# ============================================
# Run this script after setting up your DATABASE_URL
# 
# Usage (PowerShell):
#   .\quick-setup-db.ps1
#
# Or (Bash):
#   chmod +x quick-setup-db.sh
#   ./quick-setup-db.sh
# ============================================

Write-Host "`n"
Write-Host "🚀 AI Fashion Extractor - Database Setup" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Check if DATABASE_URL is set
Write-Host "🔍 Checking environment..." -ForegroundColor Yellow

if (!(Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env file with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content .env -Raw
if ($envContent -notmatch 'DATABASE_URL="postgresql://') {
    Write-Host "⚠️  DATABASE_URL not found in .env" -ForegroundColor Yellow
    Write-Host "   Please add your database connection string" -ForegroundColor Yellow
    Write-Host "`n   Example:" -ForegroundColor Gray
    Write-Host '   DATABASE_URL="postgresql://user:pass@host:5432/dbname"' -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Environment configured`n" -ForegroundColor Green

# Step 1: Generate Prisma Client
Write-Host "📦 Step 1/4: Generating Prisma Client..." -ForegroundColor Cyan
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma client generated`n" -ForegroundColor Green

# Step 2: Push schema to database
Write-Host "📊 Step 2/4: Creating database tables..." -ForegroundColor Cyan
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create tables" -ForegroundColor Red
    Write-Host "   Check your DATABASE_URL and database connection" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Database tables created`n" -ForegroundColor Green

# Step 3: Seed database (optional, will fail until imports are fixed)
Write-Host "🌱 Step 3/4: Seeding database..." -ForegroundColor Cyan
Write-Host "   ⚠️  Note: This will fail until you fix the import paths in seed.ts" -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Seed failed (expected - imports need to be fixed)" -ForegroundColor Yellow
    Write-Host "   You can skip this for now and seed manually later`n" -ForegroundColor Gray
}
else {
    Write-Host "✅ Database seeded successfully`n" -ForegroundColor Green
}

# Step 4: Open Prisma Studio
Write-Host "🎨 Step 4/4: Opening Prisma Studio..." -ForegroundColor Cyan
Write-Host "   ✨ Database admin UI will open at http://localhost:5555" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop Prisma Studio`n" -ForegroundColor Gray

npm run db:studio

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Cyan
