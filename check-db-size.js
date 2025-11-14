const { PrismaClient } = require('./src/generated/prisma');

async function checkDatabaseSize() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking database storage usage...\n');

    // Get database size
    const dbSize = await prisma.$queryRaw`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        current_database() as database_name
    `;

    console.log('📊 DATABASE SIZE:');
    console.log(`   Database: ${dbSize[0].database_name}`);
    console.log(`   Total Size: ${dbSize[0].database_size}`);
    console.log('');

    // Get table sizes
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    console.log('📋 TABLE SIZES (sorted by size):');
    console.log('─'.repeat(60));
    
    let totalBytes = 0;
    tableSizes.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename.padEnd(30)} ${table.size}`);
      totalBytes += Number(table.size_bytes);
    });
    
    console.log('─'.repeat(60));
    console.log(`   Total: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log('');

    // Get row counts
    const departments = await prisma.department.count();
    const subDepartments = await prisma.subDepartment.count();
    const categories = await prisma.category.count();
    const attributes = await prisma.masterAttribute.count();
    const allowedValues = await prisma.attributeAllowedValue.count();
    const categoryAttributes = await prisma.categoryAttribute.count();
    const users = await prisma.user.count();
    const auditLogs = await prisma.auditLog.count();

    console.log('📊 ROW COUNTS:');
    console.log(`   Departments: ${departments}`);
    console.log(`   Sub-Departments: ${subDepartments}`);
    console.log(`   Categories: ${categories}`);
    console.log(`   Master Attributes: ${attributes}`);
    console.log(`   Allowed Values: ${allowedValues}`);
    console.log(`   Category-Attribute Mappings: ${categoryAttributes}`);
    console.log(`   Users: ${users}`);
    console.log(`   Audit Logs: ${auditLogs}`);
    console.log('');

    // Calculate free tier status
    const totalMB = totalBytes / (1024 * 1024);
    const freeTierLimit = 512; // MB
    const usagePercent = ((totalMB / freeTierLimit) * 100).toFixed(2);

    console.log('🎯 NEON FREE TIER STATUS:');
    console.log(`   Used: ${totalMB.toFixed(2)} MB / ${freeTierLimit} MB`);
    console.log(`   Usage: ${usagePercent}%`);
    console.log(`   Remaining: ${(freeTierLimit - totalMB).toFixed(2)} MB`);
    
    if (totalMB < 100) {
      console.log('   ✅ Status: Excellent - plenty of space');
    } else if (totalMB < 300) {
      console.log('   ✅ Status: Good - sufficient space');
    } else if (totalMB < 450) {
      console.log('   ⚠️  Status: Warning - consider cleanup or upgrade');
    } else {
      console.log('   🚨 Status: Critical - upgrade needed soon');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSize();
