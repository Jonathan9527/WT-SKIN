#!/usr/bin/env node
/**
 * Generate complete 4-level vehicle classification from War Thunder Live API data
 * Combines filters structure with vehicle skin counts
 */

const fs = require('fs');
const path = require('path');

function extractFiltersFromHtml(htmlPath) {
    const content = fs.readFileSync(htmlPath, 'utf-8');
    
    // Find the filters object in the JavaScript
    const match = content.match(/const filters = ({.*?});/s);
    if (!match) {
        throw new Error('Could not find filters object in HTML');
    }
    
    return JSON.parse(match[1]);
}

function loadVehicleSkins(jsonPath) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

function buildVehicleHierarchy(filters, vehicleSkins) {
    // Extract vehicle types
    const vehicleTypes = {};
    for (const variant of filters.vehicleType.variants) {
        if (variant.value !== 'any') {
            vehicleTypes[variant.value] = {
                name: variant.name,
                count: variant.count || 0
            };
        }
    }
    
    // Extract countries
    const countries = {};
    for (const variant of filters.vehicleCountry.variants) {
        if (variant.value !== 'any') {
            countries[variant.value] = {
                name: variant.name,
                count: variant.count || 0
            };
        }
    }
    
    // Extract vehicle classes with dependencies
    const vehicleClasses = {};
    for (const variant of filters.vehicleClass.variants) {
        if (variant.value && !variant.separator) {
            const dep = variant.dep || {};
            vehicleClasses[variant.value] = {
                name: variant.name,
                count: variant.count || 0,
                vehicleType: dep.vehicleType || []
            };
        }
    }
    
    // Extract vehicles with full dependencies
    const vehicles = {};
    for (const variant of filters.vehicle.variants) {
        if (variant.value && variant.value !== 'any' && !variant.separator) {
            const dep = variant.dep || {};
            const vehicleId = variant.value;
            
            // Get count from vehicleSkins if available
            const count = vehicleSkins[vehicleId]?.count || variant.count || 0;
            
            vehicles[vehicleId] = {
                name: variant.name,
                count: count,
                vehicleCountry: dep.vehicleCountry || [],
                vehicleType: dep.vehicleType || [],
                vehicleClass: dep.vehicleClass || []
            };
        }
    }
    
    return {
        vehicleTypes,
        countries,
        vehicleClasses,
        vehicles
    };
}

function main() {
    const htmlPath = path.join(__dirname, '..', 'api_response_head.html');
    const skinsPath = path.join(__dirname, '..', 'wt_vehicle_skins.json');
    const outputPath = path.join(__dirname, '..', 'server', 'data', 'vehicles_complete.json');
    
    console.log('Loading data...');
    const filters = extractFiltersFromHtml(htmlPath);
    const vehicleSkins = loadVehicleSkins(skinsPath);
    
    console.log('Building vehicle hierarchy...');
    const hierarchy = buildVehicleHierarchy(filters, vehicleSkins);
    
    console.log(`Found:`);
    console.log(`  - ${Object.keys(hierarchy.vehicleTypes).length} vehicle types`);
    console.log(`  - ${Object.keys(hierarchy.countries).length} countries`);
    console.log(`  - ${Object.keys(hierarchy.vehicleClasses).length} vehicle classes`);
    console.log(`  - ${Object.keys(hierarchy.vehicles).length} vehicles`);
    
    // Save to file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(hierarchy, null, 2), 'utf-8');
    
    console.log(`\nSaved to ${outputPath}`);
    
    // Print sample
    const firstVehicleId = Object.keys(hierarchy.vehicles)[0];
    console.log('\nSample vehicle (first one):');
    console.log(`  ID: ${firstVehicleId}`);
    console.log(`  Data: ${JSON.stringify(hierarchy.vehicles[firstVehicleId], null, 4)}`);
}

main();
