import type { SchemaItem, AllowedValue } from '../types/extraction';

export class PromptService {
  // 🎯 ENHANCED SEMANTIC PRECISION PROMPT
  generateCategoryFocusedPrompt(
    schema: SchemaItem[], 
    department: string,
    subDepartment: string,
    categoryName: string
  ): string {
    console.log('🎯 Using ENHANCED SEMANTIC prompt for:', { department, subDepartment, categoryName });
    
    // Build semantic awareness for critical attributes
    const criticalSemantics = this.buildSemanticAwareness(schema);
    const categoryContext = this.buildCategoryFocusedContext(department, subDepartment, categoryName);
    
    // Generate precision prompt with semantic intelligence
    return this.buildSemanticPrecisionPrompt(schema, categoryContext, department, subDepartment, categoryName, criticalSemantics);
  }

  // 🧠 BUILD SEMANTIC AWARENESS FOR CRITICAL ATTRIBUTES
  private buildSemanticAwareness(schema: SchemaItem[]): string {
    const semanticRules: string[] = [];
    
    // Fabric Division Intelligence
    const fabDiv = schema.find(s => s.key === 'fab_division' || s.key.includes('fabric') || s.key.includes('division'));
    if (fabDiv) {
      semanticRules.push(`
🧵 FABRIC TYPE INTELLIGENCE (CRITICAL - NEVER CONFUSE):
- KNIT fabrics: stretchy, jersey, t-shirt material, flexible, soft drape
- DENIM: thick, structured, blue jean material, rigid, heavy
- WOVEN: structured, non-stretch, dress shirt material, crisp
DO NOT mix these up! Knit ≠ Denim, Denim ≠ Woven`);
    }
    
    // Color Intelligence  
    const colorAttr = schema.find(s => s.key.includes('color') || s.key.includes('shade'));
    if (colorAttr) {
      semanticRules.push(`
🎨 COLOR PRECISION:
- Be specific: "Navy Blue" not just "Blue"
- Distinguish shades: Light Blue vs Dark Blue vs Navy
- Consider lighting: Account for image lighting effects`);
    }
    
    // Pattern Intelligence
    const patternAttr = schema.find(s => s.key.includes('pattern') || s.key.includes('print'));
    if (patternAttr) {
      semanticRules.push(`
🎯 PATTERN RECOGNITION INTELLIGENCE:
- ENGINEERED STRIPE (E_STP): Stripes with specific placement/design intention
- BASIC (BSC): Plain, solid, no pattern - simple construction
- CUT & SEW (C&S): Panel construction, color blocking 
- ASYMMETRICAL (ASYM): Uneven, off-center design elements
- A-LINE: Flared, flowing silhouette pattern
- Look for CONSTRUCTION vs PRINT patterns - they are different categories`);
    }
    
    // Embroidery Intelligence
    const embroideryAttr = schema.find(s => s.key.includes('embroidery') || s.key.includes('emb'));
    if (embroideryAttr) {
      semanticRules.push(`
🧵 EMBROIDERY DETECTION INTELLIGENCE:
- NO_EMB: Completely plain fabric, no decorative stitching
- BRND EMB/LOGO EMB: Company logos, brand names in stitching
- NK_EMB: Embroidery around collar/neckline area
- SLV_EMB: Embroidery on sleeves or arm areas  
- BTM_EMB: Embroidery at garment bottom/hem
- PLCMNT_EMB: Specific positioned embroidery design
- Look for RAISED THREADS, STITCHED DESIGNS, or DECORATIVE ELEMENTS
- Don't confuse prints with embroidery - embroidery has texture/dimension`);
    }
    
    // Composition Intelligence
    const compositionAttr = schema.find(s => s.key.includes('composition') || s.key.includes('fab_'));
    if (compositionAttr) {
      semanticRules.push(`
🧬 FABRIC COMPOSITION INTELLIGENCE:
- Use RETAIL INDUSTRY STANDARDS for fiber blends
- Common blends: 60% Cotton/40% Poly, 95% Cotton/5% Lycra, 100% Cotton
- Stretch fabrics typically have 3-5% Lycra/Spandex/Elastane
- Athletic wear: 90% Poly/10% Lycra or similar synthetic blends
- Check specification boards for exact fiber percentages
- Map industry terms: "Cotton Poly Blend" = 60% CTN, 40% POLY`);
    }
    
    // Size & GSM Range Intelligence  
    const rangeAttr = schema.find(s => s.key === 'size' || s.key.includes('gsm'));
    if (rangeAttr) {
      semanticRules.push(`
📏 SIZE & GSM RANGE INTELLIGENCE:
- Handle handwriting errors: s-xxl, s.m.l, s/m/l = S-XXL or S-L range
- Normalize dashes, dots, spaces in ranges: "s . m . l" = "S-L"
- GSM ranges: "180-220g", "180.220g" = "180-220G"
- Single values: "M", "180g" = "M", "180G"
- Use specification boards for accurate size/GSM readings`);
    }
    
    // Size Intelligence
    const sizeAttr = schema.find(s => s.key === 'size');
    if (sizeAttr) {
      semanticRules.push(`
📏 SIZE DETECTION:
- Look for visible size tags, labels
- If no tag visible, estimate from garment proportions
- Standard progression: XS, S, M, L, XL, XXL`);
    }
    
    return semanticRules.join('\n');
  }

  // 🚀 NEW: Token-optimized schema-driven prompt generation
  generateOptimizedPrompt(
    schema: SchemaItem[], 
    categoryName?: string, 
    department?: string, 
    subDepartment?: string
  ): string {
    console.log('⚡ Using OPTIMIZED prompt method for:', { department, subDepartment, categoryName });
    console.log('🔍 Schema has size attribute:', schema.some(s => s.key === 'size'));
    // If we have complete category info, use category-focused approach
    if (department && subDepartment && categoryName) {
      return this.generateCategoryFocusedPrompt(schema, department, subDepartment, categoryName);
    }
    
    // Fallback to token budget approach
    const tokenBudget = this.calculateTokenBudget(schema.length);
    const categoryContext = this.getCategorySpecificContext(department, subDepartment, categoryName);
    
    // Compress schema based on token budget
    const optimizedSchema = this.compressSchemaForTokens(schema, tokenBudget);
    
    return this.buildOptimizedPrompt(optimizedSchema, categoryContext, tokenBudget);
  }

  // ✅ Original method for v1.0, enhanced for allowedValues objects and fullForm
  generateGenericPrompt(schema: SchemaItem[]): string {
    console.log('📝 Using GENERIC prompt method');
    console.log('🔍 Schema has size attribute:', schema.some(s => s.key === 'size'));
    
    const attributeDescriptions = schema
      .map((item) => {
        const allowedValues =
          item.allowedValues?.length
            ? ` (allowed values: ${item.allowedValues
                .map((av) => {
                  if (typeof av === 'string') {
                    return av;
                  }
                  return av.fullForm ?? av.shortForm;
                })
                .join(', ')})`
            : '';
        return `- ${item.key}: ${item.label}${allowedValues}`;
      })
      .join('\n');

    return `
You are an AI fashion attribute extraction specialist. Analyze this clothing image and extract the following attributes with high accuracy.

REQUIRED ATTRIBUTES:
${attributeDescriptions}

INSTRUCTIONS:
1. 🎯 USE SPECIFICATION GUIDANCE: If specification boards/papers are present, use them as expert reference for accurate extraction
2. 📝 READ ALL TEXT SOURCES: Specification boards contain correct attribute details that guide your analysis
3. 🔍 COMPREHENSIVE ANALYSIS: Combine specification guidance with visual garment examination for accuracy
4. For select attributes, ONLY use values from the allowed list
5. For text/number attributes, provide precise descriptive values using specification guidance when available
6. If an attribute is not visible/applicable, use null
7. Provide confidence scores (0-100) - higher confidence when specifications confirm visual analysis

CRITICAL: Return ONLY valid JSON without markdown formatting or code blocks.

OUTPUT FORMAT (JSON ONLY):
{
  "attribute_key": {
    "rawValue": "extracted_value",
    "schemaValue": "normalized_value",
    "visualConfidence": 85,
    "reasoning": "brief_explanation"
  }
}

Return pure JSON only. No markdown, no explanations, no code blocks.`.trim();
  }

  // ✅ Original category method, enhanced for allowedValues objects
  generateCategorySpecificPrompt(schema: SchemaItem[], categoryName: string): string {
    const basePrompt = this.generateGenericPrompt(schema);
    const categoryContext = this.getCategoryContext(categoryName);

    return `${basePrompt}

CATEGORY CONTEXT:
You are analyzing a ${categoryName}. ${categoryContext}
Pay special attention to attributes most relevant to this category type.

CRITICAL: Return pure JSON only, no markdown code blocks.`.trim();
  }

  // 🆕 Discovery method for v1.1 R&D, enhanced for allowedValues objects
  generateDiscoveryPrompt(schema: SchemaItem[], categoryName?: string): string {
    const schemaAttributes = schema
      .map(
        (item) => {
          const allowedValues = item.allowedValues?.length
            ? ` (allowed: ${item.allowedValues
                .map((av) => {
                  if (typeof av === 'string') {
                    return av;
                  }
                  return av.fullForm ?? av.shortForm;
                })
                .join(', ')})`
            : '';
          const description = item.description ? ` - ${item.description}` : '';
          return `- ${item.key}: ${item.label}${allowedValues}${description}`;
        }
      )
      .join('\n');

    const categoryContext = categoryName ? this.getCategoryContext(categoryName) : '';

    return `
You are an advanced AI fashion attribute extraction specialist. Analyze this clothing image comprehensively.

REQUIRED SCHEMA ATTRIBUTES (extract these first):
${schemaAttributes}

${categoryName ? `CATEGORY CONTEXT: You are analyzing a ${categoryName}. ${categoryContext}` : ''}

DISCOVERY MODE - ALSO EXTRACT ADDITIONAL VISIBLE ATTRIBUTES:

BRAND & LABELS:
- Brand logos, designer labels, manufacturer tags
- Care instruction labels, size tags, country of origin
- Model numbers, style codes, fabric content labels

CONSTRUCTION & HARDWARE:
- Button details: material (plastic/metal/wood), style, count
- Zipper details: brand (YKK/other), material, color, style
- Hardware: buckles, grommets, rivets, snaps, hooks
- Stitching: color, style (flat-fell, overlock, topstitch)
- Seam details: French seams, bound seams, raw edges

FABRIC & TEXTURE:
- Fabric weave: twill, plain, herringbone, jacquard
- Texture: smooth, textured, ribbed, waffle, cable knit
- Surface treatments: stonewashed, distressed, coated
- Fabric weight: lightweight, medium, heavy, structured

DESIGN DETAILS:
- Embellishments: embroidery, appliqué, beading, sequins
- Prints: floral, geometric, abstract, text, brand logos
- Functional details: pockets (patch/welt/slash), belts, ties
- Decorative elements: piping, contrast trim, color blocking

OUTPUT FORMAT - RETURN VALID JSON:
{
  "schemaAttributes": {
    "schema_key": {
      "rawValue": "exactly what you observe",
      "schemaValue": "normalized to fit schema",
      "visualConfidence": 85,
      "reasoning": "clear explanation"
    }
  },
  "discoveries": {
    "descriptive_key": {
      "rawValue": "detailed observation",
      "normalizedValue": "clean, structured value",
      "confidence": 82,
      "reasoning": "what you saw and why it's significant",
      "suggestedType": "text|select|number",
      "possibleValues": ["value1", "value2"]
    }
  }
}

CRITICAL RULES:
1. Only extract what you can clearly and confidently see
2. Use descriptive keys: "button_material" not "btn_mat"
3. Provide detailed reasoning for discoveries
4. Suggest data types: "select" for categories, "text" for descriptions
5. Include possible values for select types
6. Return pure JSON only - no markdown

Focus on commercially valuable attributes that fashion professionals would find useful.`.trim();
  }

  getDiscoveryHints(categoryName: string): string[] {
    const hints: Record<string, string[]> = {
      'Kids Bermuda': [
        'waistband_type',
        'closure_type',
        'pocket_count',
        'leg_opening_style',
        'belt_loops',
        'fabric_stretch',
        'safety_features',
        'size_adjustability',
      ],
      'Ladies Cig Pant': [
        'waist_height',
        'leg_cut',
        'pleat_style',
        'hem_style',
        'fabric_drape',
        'closure_quality',
        'trouser_style',
        'professional_features',
      ],
      'Mens T Shirt': [
        'collar_style',
        'sleeve_hem',
        'side_seams',
        'shoulder_construction',
        'neckline_binding',
        'fabric_weight',
        'print_technique',
        'tag_style',
      ],
    };

    return hints[categoryName] || [
      'fabric_texture',
      'construction_quality',
      'design_elements',
      'functional_features',
    ];
  }

  // 🎯 SEMANTIC PRECISION PROMPT BUILDER
  private buildSemanticPrecisionPrompt(
    schema: SchemaItem[],
    categoryContext: string,
    department: string,
    subDepartment: string,
    categoryName: string,
    semanticRules: string
  ): string {
    const attributeDescriptions = schema
      .map((item) => {
        const allowedValues = item.allowedValues?.length
          ? ` (EXACT VALUES: ${item.allowedValues
              .map((av) => {
                if (typeof av === 'string') return av;
                return `${av.shortForm}="${av.fullForm || av.shortForm}"`;
              })
              .join(', ')})`
          : '';
        return `- ${item.key}: ${item.label}${allowedValues}`;
      })
      .join('\n');

    return `
🧠 ADVANCED FASHION AI SPECIALIST - SEMANTIC PRECISION MODE

You are analyzing a ${department} > ${subDepartment} > ${categoryName}

${semanticRules}

REQUIRED ATTRIBUTES (EXTRACT WITH SEMANTIC PRECISION):
${attributeDescriptions}

${categoryContext}

🎯 CRITICAL SEMANTIC RULES:
1. NEVER confuse fabric types: Knit vs Denim vs Woven are completely different
2. 🎯 USE SPECIFICATION GUIDANCE: Specification boards/papers contain expert reference information
3. 📝 COMPREHENSIVE SOURCE ANALYSIS: Use specification details + garment examination for accuracy
4. Use SEMANTIC UNDERSTANDING: "knitted fiber" = KNITS, not DENIM (use specifications for guidance)
5. REJECT if nothing semantically matches - don't force random matches
6. Be PRECISE with colors vs shades - they're different attributes (use specification guidance)
7. Look for CONTEXTUAL CLUES: Use specification board details to guide attribute identification

🔍 COMPREHENSIVE ANALYSIS METHODOLOGY:
1. 🎯 READ SPECIFICATION GUIDANCE: Use specification boards/papers as expert reference for accurate extraction
2. 📝 COMPREHENSIVE SOURCE ANALYSIS: Combine specification details with garment visual examination
3. IDENTIFY FABRIC TYPE WITH SPECS: Use specification board details to guide fabric identification
4. READ ALL TEXT SOURCES: Specification boards + garment labels provide complete attribute information
5. CROSS-REFERENCE ANALYSIS: Compare specification details with visual garment observations
6. CONTEXTUAL CONSISTENCY: Use specification guidance to ensure accurate attribute matching
7. COLOR vs SHADE DISTINCTION: Use specification details to distinguish between attributes accurately
8. SEMANTIC MATCHING: Use specification board guidance for accurate semantic matching (e.g., "knitted" = KNITS)
9. UTILIZE EXPERT SPECIFICATIONS: Specification boards contain professional attribute details that improve accuracy

OUTPUT FORMAT (PURE JSON ONLY):
{
  "attribute_key": {
    "rawValue": "EXACTLY what you observe in the image",
    "schemaValue": "ONLY if perfect match to allowed values, else use rawValue",
    "visualConfidence": 95,
    "reasoning": "Detailed explanation of what you saw and why you chose this value"
  }
}

⚡ RETURN PURE JSON ONLY - NO MARKDOWN, NO CODE BLOCKS, NO EXPLANATIONS`.trim();
  }

  private getCategoryContext(categoryName: string): string {
    const contexts: Record<string, string> = {
      'Kids Bermuda':
        "Focus on casual wear attributes like fit, length, fabric type, and comfort features typical for children's shorts.",
      'Ladies Cig Pant':
        'Emphasize formal wear characteristics, fit type, fabric composition, and professional styling details.',
      'Mens T Shirt':
        'Prioritize casual wear elements like neck type, sleeve style, fabric composition, and print details.',
    };

    return contexts[categoryName] || 'Analyze all visible fashion attributes systematically.';
  }

  // 🚀 TOKEN OPTIMIZATION METHODS

  private calculateTokenBudget(schemaLength: number): 'minimal' | 'standard' | 'extended' {
    if (schemaLength <= 5) return 'minimal';    // ~1500 tokens
    if (schemaLength <= 12) return 'standard';  // ~2500 tokens  
    return 'extended';                          // ~3500 tokens
  }

  private getCategorySpecificContext(
    department?: string, 
    subDepartment?: string, 
    categoryName?: string
  ): string {
    const contextKey = `${department}_${subDepartment}_${categoryName}`.toLowerCase();
    
    const contexts: Record<string, string> = {
      // Kids department contexts
      'kids_bottoms_bermuda': 'Focus: comfort, safety features, adjustable waistbands, durable materials',
      'kids_tops_tshirt': 'Focus: soft fabrics, easy care, fun prints, comfortable fit',
      
      // Ladies department contexts  
      'ladies_bottoms_cigarette_pant': 'Focus: professional fit, fabric drape, tailored construction',
      'ladies_tops_blouse': 'Focus: elegant details, fabric quality, professional styling',
      
      // Mens department contexts
      'mens_tops_tshirt': 'Focus: fit type, fabric weight, construction quality, style details',
      'mens_bottoms_jeans': 'Focus: wash treatment, fit type, construction, hardware quality'
    };

    return contexts[contextKey] || this.getCategoryContext(categoryName || '');
  }

  private compressSchemaForTokens(schema: SchemaItem[], budget: 'minimal' | 'standard' | 'extended'): SchemaItem[] {
    if (budget === 'minimal') {
      // Keep only essential attributes, compress descriptions
      return schema.slice(0, 5).map(item => ({
        ...item,
        label: item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label,
        allowedValues: item.allowedValues?.slice(0, 3) // Limit allowed values
      }));
    }
    
    if (budget === 'standard') {
      // Moderate compression
      return schema.slice(0, 12).map(item => ({
        ...item,
        allowedValues: item.allowedValues?.slice(0, 5)
      }));
    }
    
    // Extended budget - minimal compression
    return schema.map(item => ({
      ...item,
      allowedValues: item.allowedValues?.slice(0, 8)
    }));
  }

  private buildOptimizedPrompt(
    schema: SchemaItem[], 
    categoryContext: string, 
    budget: 'minimal' | 'standard' | 'extended'
  ): string {
    const attributeDescriptions = schema
      .map((item) => {
        const allowedValues = item.allowedValues?.length
          ? ` (values: ${item.allowedValues
              .map((av) => typeof av === 'string' ? av : (av.fullForm || av.shortForm))
              .join(', ')})`
          : '';
        const description = item.description ? ` - ${item.description}` : '';
        return `${item.key}: ${item.label}${allowedValues}${description}`;
      })
      .join('\n');

    const baseInstructions = budget === 'minimal' 
      ? 'Extract attributes quickly and accurately.'
      : 'Examine the image carefully for each attribute with high precision.';

    return `
You are a fashion AI specialist. ${categoryContext}

EXTRACT THESE ATTRIBUTES:
${attributeDescriptions}

RULES:
1. ${baseInstructions}
2. Use ONLY provided allowed values
3. Return null if not visible
4. Provide confidence (0-100)

OUTPUT JSON:
{
  "attribute_key": {
    "rawValue": "observed_value",
    "schemaValue": "normalized_value", 
    "visualConfidence": 85,
    "reasoning": "brief_explanation"
  }
}

Return pure JSON only.`.trim();
  }

  // 🎯 CATEGORY-FOCUSED METHODS

  private buildCategoryFocusedContext(
    department: string,
    subDepartment: string,
    categoryName: string
  ): string {
    const contextKey = `${department}_${subDepartment}_${categoryName}`.toLowerCase();
    
    const focusedContexts: Record<string, string> = {
      // 👕 T-Shirts - Focus on fit, style, fabric basics
      'mens_tops_tshirt': 'You are analyzing a MENS T-SHIRT. Focus on: neck style, sleeve type, fit, fabric composition, and print details. Ignore belt, trouser, or formal wear attributes.',
      
      // 👖 Jeans/Pants - Focus on fit, waist, construction  
      'mens_bottoms_jeans': 'You are analyzing MENS BOTTOMS (jeans/pants). Focus on: fit type, waist details, length, pocket construction, and fabric treatment. Ignore sleeve, collar, or top-related attributes.',
      
      // 👗 Ladies Blouse - Focus on style, fit, details
      'ladies_tops_blouse': 'You are analyzing a LADIES BLOUSE/TOP. Focus on: neckline, sleeve style, fit, fabric, and closure details. Ignore bottom-wear or casual wear attributes.',
      
      // 🩳 Kids Bermuda - Focus on comfort, safety, adjustability
      'kids_ib_ib_bermuda': 'You are analyzing KIDS BERMUDA SHORTS. Focus on: fit, length, waist adjustability, pocket details, and comfort features. Ignore formal wear or adult-specific attributes.',
    };

    return focusedContexts[contextKey] || 
           `You are analyzing a ${categoryName} from ${department} ${subDepartment}. Focus on attributes most relevant to this specific garment type.`;
  }

  private buildCategoryFocusedPrompt(
    schema: SchemaItem[],
    categoryContext: string,
    department: string,
    subDepartment: string,
    categoryName: string
  ): string {
    
    // Debug: Check size attribute allowed values
    const sizeAttr = schema.find(attr => attr.key === 'size');
    if (sizeAttr) {
      console.log('🔍 Size attribute in prompt schema:', {
        key: sizeAttr.key,
        allowedValuesCount: sizeAttr.allowedValues?.length,
        hasSXXL: sizeAttr.allowedValues?.some(av => 
          typeof av === 'string' ? av === 'S-XXL' : av.shortForm === 'S-XXL'
        ),
        sampleValues: sizeAttr.allowedValues?.slice(0, 10).map(av => 
          typeof av === 'string' ? av : av.shortForm
        )
      });
    }
    
    // Separate essential vs optional attributes
    const essentialAttrs = schema.filter(attr => attr.required === true);
    const optionalAttrs = schema.filter(attr => attr.required !== true);
    
    const formatAttributes = (attrs: SchemaItem[], label: string) => {
      if (attrs.length === 0) return '';
      
      const descriptions = attrs.map((item) => {
        const allowedValues = item.allowedValues?.length
          ? ` (${item.allowedValues.slice(0, 5).map((av) => 
              typeof av === 'string' ? av : (av.fullForm || av.shortForm)
            ).join(', ')}${item.allowedValues.length > 5 ? '...' : ''})`
          : '';
        const description = item.description ? ` - ${item.description}` : '';
        
        // Debug: Log size attribute specifically
        if (item.key === 'size') {
          console.log('🔍 Size attribute in prompt:', {
            allowedValues: allowedValues,
            first5Values: item.allowedValues?.slice(0, 5).map((av) => 
              typeof av === 'string' ? av : (av.fullForm || av.shortForm)
            )
          });
        }
        
        return `• ${item.key}: ${item.label}${allowedValues}${description}`;
      });
      
      return `\n${label}:\n${descriptions.join('\n')}`;
    };

    const essentialSection = formatAttributes(essentialAttrs, 'ESSENTIAL ATTRIBUTES (must extract)');
    const optionalSection = formatAttributes(optionalAttrs, 'ADDITIONAL ATTRIBUTES (if visible)');

    return `
You are an expert fashion attribute extraction AI. ${categoryContext}

CATEGORY: ${department} → ${subDepartment} → ${categoryName}

EXTRACTION FOCUS:
Only analyze attributes relevant to this specific garment type. Ignore unrelated attributes.
${essentialSection}${optionalSection}

EXTRACTION RULES:
1. COMPLETENESS: Extract ALL visible attributes - aim for 80-90% completion rate
2. EXACT MATCHING: Extract exactly what you see on the garment:
   - If you see "S-XXL" (size range), use "S-XXL"
   - If you see individual sizes like "M", use "M"
   - If you see "Small", use "S" (standard abbreviation)
3. FLEXIBLE MATCHING: 
   - "Small/S" → "S"
   - "Medium/M" → "M" 
   - "2XL/XXL" → "2XL"
   - "Cotton blend" → "Cotton" (closest match)
4. CONFIDENCE: Rate your certainty (0-100)
5. NULL HANDLING: Only use null if attribute is genuinely not visible/applicable

CRITICAL: Return ONLY this JSON format:
{
  "attribute_key": {
    "rawValue": "what_you_observe",
    "schemaValue": "normalized_allowed_value", 
    "visualConfidence": 85,
    "reasoning": "why_this_value"
  }
}

Analyze the image now and return pure JSON only.`.trim();
  }

  // 🔍 CROP-SPECIFIC ANALYSIS PROMPT
  generateCropAnalysisPrompt(schema: SchemaItem[], section: string, categoryName?: string): string {
    const sectionFocus = this.getSectionSpecificFocus(section);
    
    // Filter schema to relevant attributes for this section
    const relevantAttributes = this.filterSchemaForSection(schema, section);
    
    if (relevantAttributes.length === 0) {
      // If no relevant attributes, return minimal analysis
      return `Analyze this ${section} section of the fashion item. Look for any visible details that might be relevant for attribute extraction. Return empty JSON {} if no clear attributes are visible.`;
    }
    
    const attributeDescriptions = relevantAttributes
      .map((item) => {
        const allowedValues = Array.isArray(item.allowedValues) 
          ? item.allowedValues.join(', ')
          : typeof item.allowedValues === 'object'
          ? Object.keys(item.allowedValues).join(', ')
          : 'Any text value';
          
        return `- ${item.key}: ${item.description || item.key} (${allowedValues})`;
      })
      .join('\n');

    return `🔍 FOCUSED ${section.toUpperCase()} SECTION ANALYSIS

${sectionFocus}

Focus ONLY on these attributes visible in this section:
${attributeDescriptions}

${categoryName ? `Category: ${categoryName}` : ''}

ANALYSIS RULES:
1. Only extract attributes clearly visible in this image section
2. Use 60+ confidence only if you can clearly see the detail
3. Return empty object {} if no attributes are clearly visible
4. Focus on section-specific details, not overall garment analysis


Return JSON in this format:
{
  "attribute_key": {
    "rawValue": "what_you_observe_in_section",
    "schemaValue": "normalized_value", 
    "visualConfidence": 65,
    "reasoning": "why_visible_in_this_section"
  }
}

Return pure JSON only.`;
  }

  private getSectionSpecificFocus(section: string): string {
    switch (section) {
      case 'top':
        return `🔍 TOP SECTION FOCUS:
- Necklines, collars, lapels
- Brand labels, size tags, care labels  
- Shoulder construction, sleeves (if visible)
- Upper chest details, pockets
- Any visible text or printed information`;
        
      case 'center':
        return `🔍 CENTER SECTION FOCUS:
- Main fabric type and texture
- Primary color and patterns
- Sleeve details, cuffs
- Waist construction, fit
- Central design elements`;
        
      case 'bottom':
        return `🔍 BOTTOM SECTION FOCUS:
- Hem construction and length
- Lower garment details
- Trouser/skirt/dress bottom features
- Construction seams, stitching
- Any size or care labels at bottom`;
        
      default:
        return 'Analyze all visible fashion attributes in this section.';
    }
  }

  private filterSchemaForSection(schema: SchemaItem[], section: string): SchemaItem[] {
    // Define which attributes are most relevant for each section
    const sectionRelevance: { [key: string]: string[] } = {
      'top': ['neckline', 'collar', 'sleeve', 'shoulder', 'label', 'brand', 'size'],
      'center': ['fabric', 'color', 'pattern', 'texture', 'fit', 'waist', 'sleeve'],
      'bottom': ['length', 'hem', 'construction', 'inseam', 'rise', 'leg'],
      'full': [] // Full image gets all attributes
    };
    
    if (section === 'full') {
      return schema; // Return all attributes for full image
    }
    
    const relevantKeywords = sectionRelevance[section] || [];
    
    return schema.filter(item => {
      const keyLower = item.key.toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      
      return relevantKeywords.some(keyword => 
        keyLower.includes(keyword) || descLower.includes(keyword)
      );
    });
  }

  // 📖 ENHANCE PROMPT WITH OCR DATA
  enhancePromptWithOCR(basePrompt: string, ocrLabels: any): string {
    if (!ocrLabels || Object.values(ocrLabels).flat().length <= 1) {
      return basePrompt;
    }

    let ocrEnhancement = '\n\n📖 OCR-DETECTED TEXT FROM IMAGE:\n';
    
    if (ocrLabels.sizeLabels?.length > 0) {
      ocrEnhancement += `🔖 SIZE LABELS: ${ocrLabels.sizeLabels.join(', ')}\n`;
    }
    
    if (ocrLabels.brandLabels?.length > 0) {
      ocrEnhancement += `🏷️ BRAND LABELS: ${ocrLabels.brandLabels.join(', ')}\n`;
    }
    
    if (ocrLabels.materialLabels?.length > 0) {
      ocrEnhancement += `🧵 MATERIAL LABELS: ${ocrLabels.materialLabels.join(', ')}\n`;
    }
    
    if (ocrLabels.careLabels?.length > 0) {
      ocrEnhancement += `🧽 CARE LABELS: ${ocrLabels.careLabels.join(', ')}\n`;
    }
    
    if (ocrLabels.countryLabels?.length > 0) {
      ocrEnhancement += `🌍 ORIGIN LABELS: ${ocrLabels.countryLabels.join(', ')}\n`;
    }
    
    if (ocrLabels.priceLabels?.length > 0) {
      ocrEnhancement += `💰 PRICE LABELS: ${ocrLabels.priceLabels.join(', ')}\n`;
    }

    if (ocrLabels.generalText?.length > 0) {
      const relevantText = ocrLabels.generalText
        .filter((text: string) => text.length > 3 && text.length < 50)
        .slice(0, 10) // Limit to prevent token overflow
        .join(', ');
      if (relevantText) {
        ocrEnhancement += `📝 OTHER TEXT: ${relevantText}\n`;
      }
    }

    ocrEnhancement += `
🎯 CRITICAL OCR ANALYSIS RULES:
1. SPECIFICATION BOARD INTELLIGENCE:
   - Specification boards/papers contain CORRECT REFERENCE INFORMATION
   - Use board specifications to GUIDE and VALIDATE your garment analysis
   - Board details help you understand what to look for in the garment
   - Cross-reference visual observations with specification details
   
2. COMPREHENSIVE OCR USAGE:
   - Garment tags/labels: Primary source for size, brand, care instructions
   - Specification boards: Reference guide for accurate attribute extraction
   - Board text: Contains expert specifications that assist analysis
   - Handwritten specs: Professional notes that provide attribute guidance
   
3. INTELLIGENT ANALYSIS METHODOLOGY:
   - READ specification board for attribute guidance
   - ANALYZE garment visually to confirm specifications
   - CROSS-REFERENCE board details with visual observations
   - USE board information to improve extraction accuracy
   
💡 SMART OCR USAGE: Utilize ALL text sources - specification boards provide expert guidance that helps ensure accurate garment analysis and attribute extraction.
`;

    return basePrompt + ocrEnhancement;
  }
}