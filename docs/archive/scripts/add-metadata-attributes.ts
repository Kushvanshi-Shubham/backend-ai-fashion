/**
 * Add Metadata Attributes to Master Attributes
 * 
 * This script adds special metadata attributes that appear on product tags/boards:
 * - Vendor Name
 * - Design Number
 * - PPT Number
 * - Cost Price
 * - Selling Price
 * 
 * These will be extracted from visible tags in images and treated as regular attributes.
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const METADATA_ATTRIBUTES = [
  {
    key: 'vendor_name',
    label: 'Vendor Name',
    fullForm: 'Vendor/Company Name',
    type: 'TEXT',
    category: 'metadata',
    description: 'Name of the vendor/company visible on product tag or board',
    isRequired: false,
    displayOrder: -5,
    aiExtractable: true,
    visibleFromDistance: true,
    extractionPriority: 100, // High priority
    confidenceThreshold: 0.80
  },
  {
    key: 'design_number',
    label: 'Design Number',
    fullForm: 'Design Number / SKU',
    type: 'TEXT',
    category: 'metadata',
    description: 'Product design number, SKU, or DSN code from tag',
    isRequired: false,
    displayOrder: -4,
    aiExtractable: true,
    visibleFromDistance: true,
    extractionPriority: 100,
    confidenceThreshold: 0.85
  },
  {
    key: 'ppt_number',
    label: 'PPT Number',
    fullForm: 'Production/PPT Number',
    type: 'TEXT',
    category: 'metadata',
    description: 'Production or PPT number from tag',
    isRequired: false,
    displayOrder: -3,
    aiExtractable: true,
    visibleFromDistance: true,
    extractionPriority: 95,
    confidenceThreshold: 0.80
  },
  {
    key: 'rate',
    label: 'Rate/Price',
    fullForm: 'Product Rate or Price',
    type: 'NUMBER',
    category: 'metadata',
    description: 'Price or rate information from tag',
    isRequired: false,
    displayOrder: -2,
    aiExtractable: true,
    visibleFromDistance: true,
    extractionPriority: 90,
    confidenceThreshold: 0.85
  },
  {
    key: 'gsm',
    label: 'GSM',
    fullForm: 'Grams per Square Meter',
    type: 'TEXT',
    category: 'metadata',
    description: 'Fabric weight (GSM) from tag',
    isRequired: false,
    displayOrder: -1,
    aiExtractable: true,
    visibleFromDistance: true,
    extractionPriority: 85,
    confidenceThreshold: 0.80
  }
];

async function main() {
  console.log('Adding metadata attributes to master_attributes table...\n');

  for (const attr of METADATA_ATTRIBUTES) {
    try {
      // Check if already exists
      const existing = await prisma.masterAttribute.findUnique({
        where: { key: attr.key }
      });

      if (existing) {
        console.log(`⏭️  Skipping ${attr.key} - already exists`);
        continue;
      }

      // Create new attribute
      const created = await prisma.masterAttribute.create({
        data: {
          key: attr.key,
          label: attr.label,
          fullForm: attr.fullForm,
          type: attr.type as any,
          category: attr.category,
          description: attr.description,
          isRequired: attr.isRequired,
          displayOrder: attr.displayOrder,
          aiExtractable: attr.aiExtractable,
          visibleFromDistance: attr.visibleFromDistance,
          extractionPriority: attr.extractionPriority,
          confidenceThreshold: attr.confidenceThreshold
        }
      });

      console.log(`✅ Created: ${created.key} (${created.label})`);
    } catch (error) {
      console.error(`❌ Failed to create ${attr.key}:`, error);
    }
  }

  console.log('\n✅ Metadata attributes added successfully!');
  console.log('\n📊 Summary:');
  
  const metadataCount = await prisma.masterAttribute.count({
    where: { category: 'metadata' }
  });
  
  console.log(`   Total metadata attributes: ${metadataCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
