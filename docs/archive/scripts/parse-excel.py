#!/usr/bin/env python3
"""
Excel Parser for Fashion Attribute Master
Parses all 9 sheets and extracts hierarchy + attributes
"""

import pandas as pd
import json
import sys
from typing import Dict, List, Set

# Sheet names in Excel
SHEETS = [
    'KNITS-U',
    'KNITS-L', 
    'WOVEN-U',
    'WOVEN-L',
    'BOTH (K&W)-U',
    'BOTH (K&W)-L',
    'BOTH (K&W)-U&L',
    '(K&W&D)-U&L',
    'DENIM'
]

# Columns to exclude (hierarchy/metadata, not attributes)
HIERARCHY_COLS = [
    'GMT FAB DIV',
    'FINISHED GOOD SEGMENT',
    'FINISHED GOOD SEGMENT FULL NAME',
    'FINISHED GOODS DIVISION',
    'FINISHED GOODS DIVISION FULL NAME',
    'SUB-DIVISION',
    'SUB-DIVISION FULL NAME',
    'MAJOR CATEGORY',
    'MAJOR CATEGORY FULL FORM',
    'MERCHENDISE CATEGORY CODE',
    'MERCHENDISE CATEGORY DESCRIPTION',
    'MERCHENDISE CATEGORY DESCRIPTION FULL FORM',
    'SEASON',
    'SEASON FULL NAME',
    'FATHER DESIGN',
    'FATHER DESIGN FULL NAME',
    'CHILD DESIGN MICRO MVGR',
    'CHILD DESIGN FULL NAME',
    'FABRIC DIVISION',
    'FABRIC DIVISION FULL NAME',
    'FABRIC_SHEET'
]

def normalize_key(name: str) -> str:
    """Convert column name to database key"""
    if not name or pd.isna(name):
        return None
    return str(name).strip().replace('-', '_').replace(' ', '_').replace('/', '_').upper()

def categorize_attribute(attr_name: str) -> str:
    """Determine attribute category"""
    attr_upper = attr_name.upper()
    
    fabric_keywords = ['YARN', 'WEAVE', 'COMPOSITION', 'FINISH', 'CONSTRUCTION', 'GRAM', 'COUNT', 'LYCRA', 'FABRIC']
    design_keywords = ['NECK', 'COLLAR', 'SLEEVES', 'CUFF', 'FIT', 'PATTERN', 'STYLE', 'SHAPE', 'LENGTH', 'PRINT', 'EMBROIDERY', 'WASH', 'POCKET', 'WAIST', 'RISE', 'LEG', 'PLACKET']
    technical_keywords = ['GSM', 'OUNCE', 'COUNT', 'SHADE', 'SIZE']
    
    if any(kw in attr_upper for kw in fabric_keywords):
        return 'fabric'
    elif any(kw in attr_upper for kw in design_keywords):
        return 'design'
    elif any(kw in attr_upper for kw in technical_keywords):
        return 'technical'
    else:
        return 'other'

def is_ai_extractable(key: str) -> bool:
    """Determine if attribute can be extracted by AI from images"""
    # Fabric technical details are NOT visible in product photos
    non_extractable = [
        'YARN_01', 'YARN_02', 'WEAVE', 'WEAVE_2', 'COMPOSITION', 
        'FINISH', 'CONSTRUCTION', 'GRAM_PER_SQUARE_METER', 'OUNCE',
        'COUNT', 'SHADE', 'FABRIC_MAIN_MVGR'
    ]
    return key not in non_extractable

def is_visible(key: str) -> bool:
    """Determine if attribute is visible from product photo"""
    visible_keywords = [
        'NECK', 'COLLAR', 'SLEEVES', 'FIT', 'PATTERN', 'COLOR',
        'STYLE', 'SHAPE', 'LENGTH', 'PRINT', 'EMBROIDERY', 'WASH',
        'PLACKET', 'POCKET', 'WAIST', 'RISE', 'LEG', 'CLOSURE'
    ]
    return any(kw in key for kw in visible_keywords)

def get_priority(key: str) -> int:
    """Get extraction priority (1-100, higher = more important)"""
    priorities = {
        'NECK': 95,
        'COLLAR': 90,
        'SLEEVES': 90,
        'FIT': 85,
        'PATTERN': 85,
        'COLOR': 90,
        'STYLE': 80,
        'LENGTH': 75,
        'PRINT': 70,
        'EMBROIDERY': 65,
        'PLACKET': 70,
        'POCKET': 65,
        'WAIST': 75,
        'CLOSURE': 70
    }
    
    for keyword, priority in priorities.items():
        if keyword in key:
            return priority
    
    return 50  # Default

def generate_aliases(short_form: str, full_form: str) -> List[str]:
    """Generate alternative names for better AI matching"""
    aliases = set()
    
    if short_form and not pd.isna(short_form):
        aliases.add(str(short_form).strip())
        # Add variations
        aliases.add(str(short_form).replace('_', ' '))
        aliases.add(str(short_form).replace('-', ' '))
    
    if full_form and not pd.isna(full_form) and str(full_form) != str(short_form):
        aliases.add(str(full_form).strip())
        # Add variations
        aliases.add(str(full_form).replace('_', ' '))
        aliases.add(str(full_form).replace('-', ' '))
    
    return list(filter(None, aliases))

def parse_excel(file_path: str) -> Dict:
    """Parse Excel file and extract all data"""
    
    print("📊 Reading Excel file...", file=sys.stderr)
    
    all_data = []
    
    # Read all sheets
    for sheet_name in SHEETS:
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=4)
            df['FABRIC_SHEET'] = sheet_name
            all_data.append(df)
            print(f"   ✓ {sheet_name}: {len(df)} rows", file=sys.stderr)
        except Exception as e:
            print(f"   ✗ {sheet_name}: {e}", file=sys.stderr)
    
    # Combine all sheets
    combined_df = pd.concat(all_data, ignore_index=True)
    print(f"   Total rows: {len(combined_df)}", file=sys.stderr)
    
    # Extract unique departments
    print("\n🏢 Extracting Departments...", file=sys.stderr)
    departments = []
    dept_df = combined_df[['FINISHED GOODS DIVISION', 'FINISHED GOODS DIVISION FULL NAME']].drop_duplicates().dropna()
    
    for idx, row in dept_df.iterrows():
        code = str(row['FINISHED GOODS DIVISION']).strip()
        full_name = str(row['FINISHED GOODS DIVISION FULL NAME']).strip()
        departments.append({
            'code': code,
            'name': code,
            'full_name': full_name
        })
    print(f"   Found {len(departments)} departments", file=sys.stderr)
    
    # Extract unique sub-divisions
    print("\n📂 Extracting Sub-Divisions...", file=sys.stderr)
    sub_divisions = []
    subdiv_df = combined_df[[
        'FINISHED GOODS DIVISION',
        'SUB-DIVISION',
        'SUB-DIVISION FULL NAME'
    ]].drop_duplicates().dropna()
    
    for idx, row in subdiv_df.iterrows():
        dept_code = str(row['FINISHED GOODS DIVISION']).strip()
        code = str(row['SUB-DIVISION']).strip()
        full_name = str(row['SUB-DIVISION FULL NAME']).strip()
        sub_divisions.append({
            'department_code': dept_code,
            'code': code,
            'name': code,
            'full_name': full_name
        })
    print(f"   Found {len(sub_divisions)} sub-divisions", file=sys.stderr)
    
    # Extract unique major categories
    print("\n📁 Extracting Major Categories...", file=sys.stderr)
    major_categories = []
    seen_codes = set()
    cat_df = combined_df[[
        'SUB-DIVISION',
        'MAJOR CATEGORY',
        'MAJOR CATEGORY FULL FORM',
        'MERCHENDISE CATEGORY CODE',
        'MERCHENDISE CATEGORY DESCRIPTION',
        'FABRIC_SHEET'
    ]].drop_duplicates().dropna(subset=['MAJOR CATEGORY'])
    
    for idx, row in cat_df.iterrows():
        subdiv_code = str(row['SUB-DIVISION']).strip()
        original_code = str(row['MAJOR CATEGORY']).strip()
        full_form = str(row['MAJOR CATEGORY FULL FORM']).strip() if not pd.isna(row['MAJOR CATEGORY FULL FORM']) else None
        merch_code = str(row['MERCHENDISE CATEGORY CODE']).strip() if not pd.isna(row['MERCHENDISE CATEGORY CODE']) else None
        merch_desc = str(row['MERCHENDISE CATEGORY DESCRIPTION']).strip() if not pd.isna(row['MERCHENDISE CATEGORY DESCRIPTION']) else None
        fabric_sheet = str(row['FABRIC_SHEET']).strip()
        
        # Handle duplicate codes by appending fabric sheet
        code = original_code
        if code in seen_codes:
            code = f"{original_code}_{fabric_sheet}"
        seen_codes.add(code)
        
        major_categories.append({
            'sub_division_code': subdiv_code,
            'code': code,
            'name': original_code,
            'full_form': full_form,
            'merchandise_code': merch_code,
            'merchandise_desc': merch_desc,
            'fabric_sheet': fabric_sheet
        })
    print(f"   Found {len(major_categories)} major categories", file=sys.stderr)
    
    # Extract attributes
    print("\n🎨 Extracting Attributes...", file=sys.stderr)
    attributes = []
    processed_attrs = set()
    
    # Get all attribute columns
    all_cols = [col for col in combined_df.columns if col not in HIERARCHY_COLS and not str(col).startswith('Unnamed')]
    
    # Filter to actual attribute columns (not "FULL NAME" columns)
    attr_cols = [col for col in all_cols if 'FULL NAME' not in col]
    
    print(f"   Processing {len(attr_cols)} attribute columns...", file=sys.stderr)
    
    for col in attr_cols:
        key = normalize_key(col)
        if not key or key in processed_attrs:
            continue
        
        # Get full name column if exists
        full_name_col = col + ' FULL NAME'
        has_full_names = full_name_col in combined_df.columns
        
        # Get unique values
        unique_values = combined_df[col].dropna().unique()
        
        # Build value mapping (deduplicate by short_form)
        allowed_values = []
        seen_values = set()
        
        if has_full_names:
            value_df = combined_df[[col, full_name_col]].drop_duplicates().dropna()
            for _, row in value_df.iterrows():
                short = str(row[col]).strip()
                full = str(row[full_name_col]).strip()
                
                if short in seen_values:
                    continue
                seen_values.add(short)
                
                allowed_values.append({
                    'short_form': short,
                    'full_form': full,
                    'aliases': generate_aliases(short, full)
                })
        else:
            # No full names, use values as both short and full
            for val in unique_values:
                val_str = str(val).strip()
                
                if val_str in seen_values:
                    continue
                seen_values.add(val_str)
                
                allowed_values.append({
                    'short_form': val_str,
                    'full_form': val_str,
                    'aliases': generate_aliases(val_str, val_str)
                })
        
        # Determine attribute properties
        category = categorize_attribute(key)
        ai_extractable = is_ai_extractable(key)
        visible = is_visible(key)
        priority = get_priority(key)
        
        attributes.append({
            'key': key,
            'label': col,
            'full_form': col,
            'category': category,
            'ai_extractable': ai_extractable,
            'visible_from_distance': visible,
            'extraction_priority': priority,
            'allowed_values': allowed_values
        })
        
        processed_attrs.add(key)
    
    print(f"   Extracted {len(attributes)} unique attributes", file=sys.stderr)
    
    # Build category-attribute mappings
    print("\n🔗 Building Category-Attribute Mappings...", file=sys.stderr)
    category_mappings = []
    
    for cat_code in combined_df['MAJOR CATEGORY'].unique():
        if pd.isna(cat_code):
            continue
        
        cat_df = combined_df[combined_df['MAJOR CATEGORY'] == cat_code]
        
        for col in attr_cols:
            # Check if this attribute has any non-null values for this category
            has_values = cat_df[col].notna().any()
            if has_values:
                attr_key = normalize_key(col)
                if attr_key:
                    category_mappings.append({
                        'major_category': str(cat_code).strip(),
                        'attribute': attr_key
                    })
    
    print(f"   Created {len(category_mappings)} mappings", file=sys.stderr)
    
    # Return all parsed data
    result = {
        'departments': departments,
        'sub_divisions': sub_divisions,
        'major_categories': major_categories,
        'attributes': attributes,
        'category_mappings': category_mappings
    }
    
    print("\n✅ Parsing complete!", file=sys.stderr)
    print(f"   Departments: {len(departments)}", file=sys.stderr)
    print(f"   Sub-Divisions: {len(sub_divisions)}", file=sys.stderr)
    print(f"   Major Categories: {len(major_categories)}", file=sys.stderr)
    print(f"   Attributes: {len(attributes)}", file=sys.stderr)
    print(f"   Mappings: {len(category_mappings)}", file=sys.stderr)
    
    return result

if __name__ == '__main__':
    try:
        # Parse Excel file
        file_path = 'D:/ai-extracto/ai-vlm-integration/ATTRIBUTE MASTER.xlsx'
        data = parse_excel(file_path)
        
        # Output as JSON to stdout
        print(json.dumps(data, indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
