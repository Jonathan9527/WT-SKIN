#!/usr/bin/env python3
"""
Generate complete 4-level vehicle classification from War Thunder Live API data
Combines filters structure with vehicle skin counts
"""

import json
import re
from pathlib import Path

def extract_filters_from_html(html_path):
    """Extract the filters JavaScript object from HTML response"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the filters object in the JavaScript
    match = re.search(r'const filters = ({.*?});', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find filters object in HTML")
    
    filters_json = match.group(1)
    return json.loads(filters_json)

def load_vehicle_skins(json_path):
    """Load vehicle skins data"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_vehicle_hierarchy(filters, vehicle_skins):
    """Build complete 4-level vehicle hierarchy"""
    
    # Extract vehicle types
    vehicle_types = {}
    for variant in filters['vehicleType']['variants']:
        if variant['value'] != 'any':
            vehicle_types[variant['value']] = {
                'name': variant['name'],
                'count': variant.get('count', 0)
            }
    
    # Extract countries
    countries = {}
    for variant in filters['vehicleCountry']['variants']:
        if variant['value'] != 'any':
            countries[variant['value']] = {
                'name': variant['name'],
                'count': variant.get('count', 0)
            }
    
    # Extract vehicle classes with dependencies
    vehicle_classes = {}
    for variant in filters['vehicleClass']['variants']:
        if variant.get('value') and not variant.get('separator'):
            dep = variant.get('dep', {})
            vehicle_classes[variant['value']] = {
                'name': variant['name'],
                'count': variant.get('count', 0),
                'vehicleType': dep.get('vehicleType', [])
            }
    
    # Extract vehicles with full dependencies
    vehicles = {}
    for variant in filters['vehicle']['variants']:
        if variant.get('value') and variant['value'] != 'any' and not variant.get('separator'):
            dep = variant.get('dep', {})
            vehicle_id = variant['value']
            
            # Get count from vehicle_skins if available
            count = vehicle_skins.get(vehicle_id, {}).get('count', variant.get('count', 0))
            
            vehicles[vehicle_id] = {
                'name': variant['name'],
                'count': count,
                'vehicleCountry': dep.get('vehicleCountry', []),
                'vehicleType': dep.get('vehicleType', []),
                'vehicleClass': dep.get('vehicleClass', [])
            }
    
    return {
        'vehicleTypes': vehicle_types,
        'countries': countries,
        'vehicleClasses': vehicle_classes,
        'vehicles': vehicles
    }

def main():
    # Paths
    html_path = Path('api_response_head.html')
    skins_path = Path('wt_vehicle_skins.json')
    output_path = Path('server/data/vehicles_complete.json')
    
    print("Loading data...")
    filters = extract_filters_from_html(html_path)
    vehicle_skins = load_vehicle_skins(skins_path)
    
    print("Building vehicle hierarchy...")
    hierarchy = build_vehicle_hierarchy(filters, vehicle_skins)
    
    print(f"Found:")
    print(f"  - {len(hierarchy['vehicleTypes'])} vehicle types")
    print(f"  - {len(hierarchy['countries'])} countries")
    print(f"  - {len(hierarchy['vehicleClasses'])} vehicle classes")
    print(f"  - {len(hierarchy['vehicles'])} vehicles")
    
    # Save to file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(hierarchy, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved to {output_path}")
    
    # Print sample
    print("\nSample vehicle (first one):")
    first_vehicle_id = list(hierarchy['vehicles'].keys())[0]
    print(f"  ID: {first_vehicle_id}")
    print(f"  Data: {json.dumps(hierarchy['vehicles'][first_vehicle_id], ensure_ascii=False, indent=4)}")

if __name__ == '__main__':
    main()
