import pandas as pd
import json
import sys
import os

def analyze_boq(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    print(f"Loading {file_path} using Pandas...")
    
    try:
        # Load the specific sheet 'SAPS-APRL-2025'
        # Skip the first 2 rows (preamble) as requested
        df = pd.read_excel(file_path, sheet_name='SAPS-APRL-2025', skiprows=2)
        
        # Standardize column names (case-insensitive mapping)
        cols = {c.lower(): c for c in df.columns}
        
        # Required columns
        desc_col = cols.get('description', cols.get('item'))
        qty_col = cols.get('quantity', cols.get('qty'))
        unit_col = cols.get('unit')
        
        if not desc_col or not qty_col:
            print("Error: Could not find required columns (Description, Quantity).")
            print(f"Available columns: {list(df.columns)}")
            sys.exit(1)
            
        # Clean data: Filter rows where Quantity is actually a number
        df[qty_col] = pd.to_numeric(df[qty_col], errors='coerce')
        active_items = df.dropna(subset=[qty_col])
        active_items = active_items[active_items[qty_col] > 0]
        
        # We need an estimated price to do the Pareto 80/20 correctly
        # We'll assign rough base prices to identify "Heavy Hitters"
        heavy_hitters = []
        total_materials_cost = 0
        total_labor_cost = 0
        
        # Gauteng 2026 Trade Rates for heavy hitters
        rates = {
            'wiring': {'material': 12.50, 'labor': 4.50}, # per meter
            'roofing': {'material': 185.00, 'labor': 65.00}, # per m2
            'timber': {'material': 45.00, 'labor': 15.00}, # per meter
            'concrete': {'material': 1200.00, 'labor': 350.00} # per m3
        }

        # Analyze active items
        for _, row in active_items.iterrows():
            desc = str(row[desc_col]).lower()
            qty = row[qty_col]
            unit = row.get(unit_col, 'unit')
            
            mat_rate = 0
            lab_rate = 0
            category = "Other"
            
            # Apply hardcoded trade rates for specific heavy hitters based on prompt
            if 'wiring' in desc or 'cable' in desc or '2.5mm' in desc:
                mat_rate = rates['wiring']['material']
                lab_rate = rates['wiring']['labor']
                category = "Electrical"
            elif 'roof' in desc or 'sheeting' in desc or 'ibr' in desc:
                mat_rate = rates['roofing']['material']
                lab_rate = rates['roofing']['labor']
                category = "Roofing"
            elif 'timber' in desc or 'purlin' in desc or 'truss' in desc:
                mat_rate = rates['timber']['material']
                lab_rate = rates['timber']['labor']
                category = "Structural Timber"
            elif 'concrete' in desc or 'cement' in desc:
                mat_rate = rates['concrete']['material']
                lab_rate = rates['concrete']['labor']
                category = "Concrete"
            else:
                mat_rate = 50.0 # fallback average
                lab_rate = 20.0
            
            total_item_mat = qty * mat_rate
            total_item_lab = qty * lab_rate
            
            total_materials_cost += total_item_mat
            total_labor_cost += total_item_lab
            
            heavy_hitters.append({
                'description': str(row[desc_col]),
                'quantity': qty,
                'unit': unit,
                'category': category,
                'material_trade_rate': mat_rate,
                'labor_rate': lab_rate,
                'total_cost': total_item_mat + total_item_lab
            })

        # Sort by total cost descending (Pareto 80/20)
        heavy_hitters.sort(key=lambda x: x['total_cost'], reverse=True)
        top_20_percent = max(1, int(len(heavy_hitters) * 0.2))
        top_hitters = heavy_hitters[:top_20_percent]

        # Output Markdown formatting as requested
        print("\n### Data Status:")
        print("✅ Excel file successfully parsed via Python (Vision API bypassed).\n")
        
        print("### Executive Summary")
        print(f"- **Total Estimated Materials (Trade Pricing):** R {total_materials_cost:,.2f}")
        print(f"- **Total Estimated Labor (Gauteng 2026):** R {total_labor_cost:,.2f}")
        print(f"- **Grand Total:** R {(total_materials_cost + total_labor_cost):,.2f}\n")
        
        print("### Strategic Price Comparison Table (Top Heavy Hitters)")
        print("| Item | Quantity | Unit | Trade Rate (Springs/Jet Park) | Labor Rate | Total Estimated Cost |")
        print("|---|---|---|---|---|---|")
        for item in top_hitters[:10]: # show top 10
            print(f"| {item['description'][:50]} | {item['quantity']:,.2f} | {item['unit']} | R{item['material_trade_rate']:.2f} | R{item['labor_rate']:.2f} | R{item['total_cost']:,.2f} |")
            
        print("\n### Labor Estimate Details")
        print("Used local Gauteng artisan rates for:")
        print("- **Roofing:** R65.00 / m2 (installation)")
        print("- **Electrical:** R4.50 / m (pulling wiring)")
        print("- **Concrete:** R350.00 / m3 (pouring & finishing)")
        
    except Exception as e:
        print(f"Error parsing Excel file: {e}")
        print("Risk Flag: Encountered a formatting error. Please check the 'SAPS-APRL-2025' sheet.")

if __name__ == '__main__':
    # Default to BoQ.xlsx
    file = 'BoQ.xlsx' if len(sys.argv) == 1 else sys.argv[1]
    analyze_boq(file)
