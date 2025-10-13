import type {
  SchemaItem,
  AttributeData,
  DiscoveredAttribute,
  EnhancedAIResponse,
  ParsedDiscoveryAttribute,
  ParsedAIAttribute,
} from '../types/extraction';

export class ResponseParser {
  async parseResponse(aiResponse: string, schema: SchemaItem[]): Promise<AttributeData> {
    try {
      const cleanedResponse = this.cleanMarkdownJson(aiResponse);
      console.log('🔍 Attempting to parse AI response:', cleanedResponse.substring(0, 200) + '...');
      const parsed = JSON.parse(cleanedResponse);
      const result: AttributeData = {};

      for (const schemaItem of schema) {
        const aiAttribute: ParsedAIAttribute | undefined = parsed[schemaItem.key];
        if (aiAttribute) {
          // If AI returns null for schemaValue but has a rawValue, try to match the rawValue
          const valueToMatch = aiAttribute.schemaValue || aiAttribute.rawValue;
          
          result[schemaItem.key] = {
            rawValue: aiAttribute.rawValue || null,
            schemaValue: this.normalizeValue(valueToMatch, schemaItem),
            visualConfidence: aiAttribute.visualConfidence || 0,
            mappingConfidence: 100,
            isNewDiscovery: false,
            reasoning: aiAttribute.reasoning,
          };
        } else {
          result[schemaItem.key] = {
            rawValue: null,
            schemaValue: null,
            visualConfidence: 0,
            mappingConfidence: 0,
            isNewDiscovery: false,
            reasoning: undefined,
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to parse legacy AI response', error);
      console.error('Raw AI response was:', aiResponse.substring(0, 500));
      
      // If AI response is not JSON, return empty attributes with null values
      if (aiResponse.includes("I'm sorry") || aiResponse.includes("I cannot") || aiResponse.includes("I apologize")) {
        console.warn('AI returned an apologetic response instead of JSON, returning empty attributes');
        const result: AttributeData = {};
        for (const schemaItem of schema) {
          result[schemaItem.key] = {
            rawValue: null,
            schemaValue: null,
            visualConfidence: 0,
            mappingConfidence: 0,
            isNewDiscovery: false,
            reasoning: 'AI could not extract this attribute'
          };
        }
        return result;
      }
      
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseEnhancedResponse(
    aiResponse: string,
    schema: SchemaItem[]
  ): Promise<{ attributes: AttributeData; discoveries: DiscoveredAttribute[] }> {
    try {
      const cleanedResponse = this.cleanMarkdownJson(aiResponse);
      const parsed = JSON.parse(cleanedResponse) as EnhancedAIResponse;

      console.log('Parsing enhanced AI response', {
        hasSchemaAttributes: !!parsed.schemaAttributes,
        hasDiscoveries: !!parsed.discoveries,
        discoveryCount: Object.keys(parsed.discoveries || {}).length,
      });

      const attributes = await this.parseSchemaAttributes(parsed, schema);
      const discoveries = this.parseDiscoveries(parsed.discoveries || {});

      console.log('Enhanced parsing completed', {
        schemaAttributesProcessed: Object.keys(attributes).length,
        discoveriesFound: discoveries.length,
        highConfidenceDiscoveries: discoveries.filter((d) => d.confidence >= 80).length,
      });

      return { attributes, discoveries };
    } catch (error) {
      console.warn('Enhanced parsing failed, falling back to schema-only', error);
      const attributes = await this.parseResponse(aiResponse, schema);
      return { attributes, discoveries: [] };
    }
  }

  private async parseSchemaAttributes(
    parsed: EnhancedAIResponse,
    schema: SchemaItem[]
  ): Promise<AttributeData> {
    const result: AttributeData = {};
    const schemaData = parsed.schemaAttributes ?? (parsed as Record<string, ParsedAIAttribute>);

    for (const schemaItem of schema) {
      const aiAttribute = schemaData[schemaItem.key];
      if (aiAttribute) {
        // If AI returns null for schemaValue but has a rawValue, try to match the rawValue
        const valueToMatch = aiAttribute.schemaValue || aiAttribute.rawValue;
        
        result[schemaItem.key] = {
          rawValue: aiAttribute.rawValue || null,
          schemaValue: this.normalizeValue(valueToMatch, schemaItem),
          visualConfidence: aiAttribute.visualConfidence || 0,
          mappingConfidence: 100,
          isNewDiscovery: false,
          reasoning: aiAttribute.reasoning,
        };
      } else {
        result[schemaItem.key] = {
          rawValue: null,
          schemaValue: null,
          visualConfidence: 0,
          mappingConfidence: 0,
          isNewDiscovery: false,
          reasoning: undefined,
        };
      }
    }

    return result;
  }

  private parseDiscoveries(discoveryData: Record<string, ParsedDiscoveryAttribute>): DiscoveredAttribute[] {
    const discoveries: DiscoveredAttribute[] = [];

    for (const [key, discovery] of Object.entries(discoveryData)) {
      if (!discovery || typeof discovery !== 'object') continue;

      try {
        const discoveredAttribute: DiscoveredAttribute = {
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          rawValue: discovery.rawValue || '',
          normalizedValue: discovery.normalizedValue || discovery.rawValue || '',
          confidence: discovery.confidence || 0,
          reasoning: discovery.reasoning || '',
          frequency: 1,
          suggestedType: discovery.suggestedType || this.inferType(discovery.rawValue || ''),
          possibleValues: discovery.possibleValues?.filter((v): v is string => Boolean(v)) || [],
          isPromotable: discovery.isPromotable
        };

        discoveries.push(discoveredAttribute);
      } catch (error) {
        console.warn('Failed to parse discovery', { key, discovery, error });
      }
    }

    return discoveries;
  }

  private cleanMarkdownJson(response: string): string {
    let cleaned = response.trim();
    
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return cleaned.trim();
  }

  private normalizeValue(value: string | number | null, schemaItem: SchemaItem): string | number | null {
    if (value === null || value === undefined) return null;

    if (schemaItem.type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? null : num;
    }

    if (schemaItem.type === 'select' && schemaItem.allowedValues?.length) {
      // SIMPLE & BULLETPROOF normalization
      const normalize = (str: string): string => {
        return str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-');
      };
      
      const inputNormalized = normalize(String(value));
      console.log(`\n🔍 ${schemaItem.key.toUpperCase()} MATCHING:`);
      console.log(`   Input: "${value}" → "${inputNormalized}"`);
      
      // Try ALL possible matches with detailed logging
      for (let i = 0; i < schemaItem.allowedValues.length; i++) {
        const allowed = schemaItem.allowedValues[i];
        
        if (typeof allowed === 'string') {
          const allowedNorm = normalize(allowed);
          console.log(`   [${i}] Testing string: "${allowed}" → "${allowedNorm}"`);
          if (allowedNorm === inputNormalized) {
            console.log(`   ✅ MATCHED string: "${allowed}"`);
            return allowed;
          }
        } else if (allowed && typeof allowed === 'object' && 'shortForm' in allowed) {
          const shortNorm = normalize(allowed.shortForm);
          const fullNorm = allowed.fullForm ? normalize(allowed.fullForm) : '';
          
          // console.log(`   [${i}] Testing object: "${allowed.shortForm}" | "${allowed.fullForm || 'N/A'}"`);
          console.log(`       → "${shortNorm}" | "${fullNorm}"`);
          
          if (shortNorm === inputNormalized) {
            console.log(`   ✅ MATCHED shortForm: "${allowed.shortForm}"`);
            return allowed.shortForm;
          }
          
          if (fullNorm && fullNorm === inputNormalized) {
            console.log(`   ✅ MATCHED fullForm: "${allowed.fullForm}" → returning "${allowed.shortForm}"`);
            return allowed.shortForm;
          }
        }
      }
      
      console.log(`   ❌ NO MATCH FOUND for "${inputNormalized}"`);
      console.log(`   Total values checked: ${schemaItem.allowedValues.length}`);
      return null;
    }

    return String(value);
  }

  private inferType(value: string): 'text' | 'select' | 'number' {
    if (!value) return 'text';
    const trimmedValue = value.trim();
    if (!isNaN(Number(trimmedValue)) && trimmedValue.length < 10 && trimmedValue.length > 0) {
      return 'number';
    }
    if (this.looksLikeCategory(trimmedValue)) {
      return 'select';
    }
    return 'text';
  }

  private looksLikeCategory(value: string): boolean {
    const trimmedValue = value.trim();
    return (
      trimmedValue.length <= 50 &&
      trimmedValue.length >= 2 &&
      !trimmedValue.includes('.') &&
      trimmedValue.split(' ').length <= 4 &&
      !/\d{2,}/.test(trimmedValue)
    );
  }

  async parseWithDebugInfo(
    aiResponse: string,
    schema: SchemaItem[]
  ): Promise<{ attributes: AttributeData; discoveries: DiscoveredAttribute[]; debugInfo: any }> {
    const result = await this.parseEnhancedResponse(aiResponse, schema);
    return {
      ...result,
      debugInfo: {
        rawResponse: aiResponse.substring(0, 200),
        cleanedResponse: this.cleanMarkdownJson(aiResponse).substring(0, 200),
        schemaItemCount: schema.length,
        timestamp: new Date().toISOString()
      }
    };
  }
}