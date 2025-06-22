import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TBuilding } from '@/types/property';

// Cache for parsed data to avoid re-reading files
let buildingsCache: TBuilding[] | null = null;

// Parse CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Parse CSV content to array of objects
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  const numericFields = new Set([
    'gsa_region', 'zip_code', 'latitude', 'longitude', 'building_rentable_square_feet', 
    'available_square_feet', 'construction_date', 'congressional_district'
  ]);
  
  return lines.slice(1).map((line, index) => {
    try {
      const values = parseCSVLine(line);
      const obj: any = {};
      
      headers.forEach((header, headerIndex) => {
        const cleanHeader = header.replace(/['"]/g, '').trim().replace(/[^\w\s]/g, '_');
        let value = values[headerIndex] || '';
        value = value.replace(/['"]/g, '').trim();
        
        if (value === '' || value === 'NA' || value === 'N/A' || value === 'null') {
          obj[cleanHeader] = null;
        } else if (numericFields.has(cleanHeader.toLowerCase()) && !isNaN(Number(value)) && value !== '') {
          obj[cleanHeader] = Number(value);
        } else {
          obj[cleanHeader] = value.replace(/[\x00-\x1F\x7F]/g, '');
        }
      });
      
      return obj;
    } catch (error) {
      return null;
    }
  }).filter(row => row !== null);
}

// Transform raw CSV row to TBuilding object
function transformToBuilding(row: any): TBuilding {
  const cleanString = (value: any): string => {
    if (!value) return '';
    return String(value).replace(/[\x00-\x1F\x7F]/g, '').replace(/\0/g, '').trim();
  };

  const cleanNumber = (value: any): number => {
    if (!value || value === '' || value === 'N/A' || value === 'NA') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  return {
    locationCode: cleanString(row['Location_Code'] || row['Location Code']),
    realPropertyAssetName: cleanString(row['Real_Property_Asset_Name'] || row['Real Property Asset Name']),
    installationName: cleanString(row['Installation_Name'] || row['Installation Name']),
    ownedOrLeased: cleanString(row['Owned_or_Leased'] || row['Owned or Leased']) as 'F' | 'L',
    gsaRegion: cleanNumber(row['GSA_Region'] || row['GSA Region']),
    streetAddress: cleanString(row['Street_Address'] || row['Street Address']),
    city: cleanString(row['City']),
    state: cleanString(row['State']),
    zipCode: cleanNumber(row['Zip_Code'] || row['Zip Code']),
    latitude: cleanNumber(row['Latitude']),
    longitude: cleanNumber(row['Longitude']),
    buildingRentableSquareFeet: cleanNumber(row['Building_Rentable_Square_Feet'] || row['Building Rentable Square Feet']),
    availableSquareFeet: cleanNumber(row['Available_Square_Feet'] || row['Available Square Feet']),
    constructionDate: cleanNumber(row['Construction_Date'] || row['Construction Date']),
    congressionalDistrict: cleanNumber(row['Congressional_District'] || row['Congressional District']),
    congressionalDistrictRepresentativeName: cleanString(row['Congressional_District_Representative_Name'] || row['Congressional District Representative Name']),
    buildingStatus: cleanString(row['Building_Status'] || row['Building Status']),
    realPropertyAssetType: cleanString(row['Real_Property_Asset_Type'] || row['Real Property Asset Type']),
  };
}

// Read and parse buildings CSV
function loadBuildingsData(): TBuilding[] {
  if (buildingsCache) {
    return buildingsCache;
  }

  try {
    const csvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-buildings.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const rawData = parseCSV(csvContent);
    
    buildingsCache = rawData
      .map(transformToBuilding)
      .filter(building => building.locationCode);
    
    console.log(`📊 Loaded ${buildingsCache.length} buildings from CSV`);
    return buildingsCache;
  } catch (error) {
    console.error('Error loading buildings CSV:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '999999');

    let buildings = loadBuildingsData();

    // Filter out buildings without valid coordinates for map
    if (searchParams.get('mapData') === 'true') {
      buildings = buildings.filter(building => 
        building.latitude && 
        building.longitude && 
        building.latitude !== 0 && 
        building.longitude !== 0
      );
    }

    if (limit < 999999) {
      buildings = buildings.slice(0, limit);
    }

    return NextResponse.json({ buildings });

  } catch (error) {
    console.error('Error in buildings API:', error);
    return NextResponse.json(
      { error: 'Failed to load buildings data' },
      { status: 500 }
    );
  }
}
 