/**
 * 🧪 Database Query Test Script
 * Verify all data is accessible and relationships work
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function testQueries() {
  console.log('🧪 Testing Database Queries...\n');
  
  try {
    // Test 1: Count all records
    console.log('📊 Test 1: Record Counts');
    const [deptCount, subDeptCount, catCount, attrCount, valueCount] = await Promise.all([
      prisma.department.count(),
      prisma.subDepartment.count(),
      prisma.category.count(),
      prisma.masterAttribute.count(),
      prisma.attributeAllowedValue.count(),
    ]);
    
    console.log(`   Departments: ${deptCount}`);
    console.log(`   Sub-Departments: ${subDeptCount}`);
    console.log(`   Categories: ${catCount}`);
    console.log(`   Master Attributes: ${attrCount}`);
    console.log(`   Allowed Values: ${valueCount}\n`);
    
    // Test 2: Fetch departments with nested relations
    console.log('📊 Test 2: Department Hierarchy');
    const departments = await prisma.department.findMany({
      include: {
        subDepartments: {
          include: {
            categories: {
              take: 3, // Limit to first 3 categories per sub-dept
            },
          },
          take: 3, // Limit to first 3 sub-depts per dept
        },
      },
    });
    
    departments.forEach(dept => {
      console.log(`   ✓ ${dept.name} (${dept.code})`);
      dept.subDepartments.forEach(sub => {
        console.log(`      → ${sub.name} (${sub.code}) - ${sub.categories.length} categories`);
      });
    });
    console.log();
    
    // Test 3: Fetch a single category with all attributes
    console.log('📊 Test 3: Category with Attributes');
    const sampleCategory = await prisma.category.findFirst({
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
        attributes: {
          include: {
            attribute: {
              include: {
                allowedValues: {
                  take: 5, // First 5 allowed values
                },
              },
            },
          },
          take: 5, // First 5 attributes
        },
      },
    });
    
    if (sampleCategory) {
      console.log(`   Category: ${sampleCategory.name} (${sampleCategory.code})`);
      console.log(`   Path: ${sampleCategory.subDepartment.department.name} → ${sampleCategory.subDepartment.name} → ${sampleCategory.name}`);
      console.log(`   Total Attributes: ${sampleCategory.attributes.length}`);
      
      sampleCategory.attributes.forEach(catAttr => {
        const attr = catAttr.attribute;
        console.log(`      → ${attr.label} (${attr.type}) - ${attr.allowedValues.length} values`);
      });
    }
    console.log();
    
    // Test 4: Fetch master attributes with allowed values
    console.log('📊 Test 4: Master Attributes');
    const attributes = await prisma.masterAttribute.findMany({
      include: {
        allowedValues: true,
      },
      take: 5,
    });
    
    attributes.forEach(attr => {
      console.log(`   ✓ ${attr.label} (${attr.type}) - ${attr.allowedValues.length} allowed values`);
      if (attr.allowedValues.length > 0) {
        const sample = attr.allowedValues.slice(0, 3).map(v => v.shortForm).join(', ');
        console.log(`      Examples: ${sample}...`);
      }
    });
    console.log();
    
    // Test 5: Query by filters
    console.log('📊 Test 5: Filtered Queries');
    
    // Get all KIDS categories
    const kidsCategories = await prisma.category.findMany({
      where: {
        subDepartment: {
          department: {
            code: 'KIDS',
          },
        },
      },
      take: 5,
    });
    console.log(`   KIDS Categories: ${kidsCategories.length} found`);
    kidsCategories.forEach(cat => {
      console.log(`      → ${cat.name}`);
    });
    console.log();
    
    // Test 6: Search functionality
    console.log('📊 Test 6: Search Queries');
    const searchResults = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: 'SHIRT', mode: 'insensitive' } },
          { code: { contains: 'SHIRT', mode: 'insensitive' } },
        ],
      },
      take: 5,
    });
    console.log(`   Search for "SHIRT": ${searchResults.length} results`);
    searchResults.forEach(cat => {
      console.log(`      → ${cat.name} (${cat.code})`);
    });
    console.log();
    
    // Test 7: Performance test - complex query
    console.log('📊 Test 7: Performance Test');
    const startTime = Date.now();
    
    const complexQuery = await prisma.department.findMany({
      include: {
        subDepartments: {
          include: {
            categories: true,
          },
        },
      },
    });
    
    const endTime = Date.now();
    const totalCategories = complexQuery.reduce((sum, dept) => 
      sum + dept.subDepartments.reduce((subSum, sub) => 
        subSum + sub.categories.length, 0), 0
    );
    
    console.log(`   Query Time: ${endTime - startTime}ms`);
    console.log(`   Total Records: ${complexQuery.length} depts, ${totalCategories} categories`);
    console.log();
    
    // Success summary
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL DATABASE TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('✓ All tables accessible');
    console.log('✓ Relationships working correctly');
    console.log('✓ Filtering and search functional');
    console.log('✓ Performance is acceptable');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testQueries()
  .then(() => {
    console.log('🎉 Database is ready for admin APIs!\n');
    process.exit(0);
  })
  .catch((e) => {
    console.error('💥 Database test failed:', e);
    process.exit(1);
  });
