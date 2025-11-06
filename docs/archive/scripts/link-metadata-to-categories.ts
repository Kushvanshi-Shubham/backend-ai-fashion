/**
 * Link Metadata Attributes to All Categories
 * 
 * Adds metadata attributes (vendor_name, design_number, ppt_number, rate, gsm)
 * to ALL categories so they appear in every schema.
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const METADATA_ATTRIBUTE_KEYS = [
  'vendor_name',
  'design_number',
  'ppt_number',
  'rate',
  'gsm'
];

async function main() {
  console.log('🔗 Linking metadata attributes to all categories...\n');

  // Get all metadata attributes
  const metadataAttributes = await prisma.masterAttribute.findMany({
    where: {
      key: { in: METADATA_ATTRIBUTE_KEYS }
    }
  });

  console.log(`Found ${metadataAttributes.length} metadata attributes`);

  // Get all categories
  const categories = await prisma.category.findMany();
  console.log(`Found ${categories.length} categories\n`);

  let linkedCount = 0;
  let skippedCount = 0;

  // Get all existing mappings at once for efficiency
  const existingMappings = await prisma.categoryAttribute.findMany({
    where: {
      attribute: {
        key: { in: METADATA_ATTRIBUTE_KEYS }
      }
    },
    select: {
      categoryId: true,
      attributeId: true
    }
  });

  const existingSet = new Set(
    existingMappings.map(m => `${m.categoryId}-${m.attributeId}`)
  );

  // Prepare batch inserts
  const toCreate = [];
  for (const category of categories) {
    for (const attr of metadataAttributes) {
      const key = `${category.id}-${attr.id}`;
      if (existingSet.has(key)) {
        skippedCount++;
        continue;
      }

      toCreate.push({
        categoryId: category.id,
        attributeId: attr.id,
        isRequired: false,
        displayOrder: attr.displayOrder
      });
    }
  }

  console.log(`Preparing to insert ${toCreate.length} new mappings...`);

  // Batch insert
  if (toCreate.length > 0) {
    await prisma.categoryAttribute.createMany({
      data: toCreate,
      skipDuplicates: true
    });
    linkedCount = toCreate.length;
    console.log(`✅ Inserted ${linkedCount} mappings in batch`);
  }

  console.log(`\n✅ Linking complete!`);
  console.log(`   Linked: ${linkedCount} new mappings`);
  console.log(`   Skipped: ${skippedCount} existing mappings`);
  
  // Verify
  const totalMappings = await prisma.categoryAttribute.count({
    where: {
      attribute: {
        key: { in: METADATA_ATTRIBUTE_KEYS }
      }
    }
  });
  
  console.log(`   Total metadata mappings in database: ${totalMappings}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
