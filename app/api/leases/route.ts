import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { enhanceLeasedBuildingsWithMultipleLeases, getLeaseStatistics, EnhancedLeasedBuildingWithMultipleLeases } from '@/lib/services/lease-data-service';

// Interface for lease record from CSV
interface LeaseRecord {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  federalLeasedCode: string;
  gsaRegion: number;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: number;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  congressionalDistrict: number;
  congressionalDistrictRepresentative: string;
  leaseNumber: string;
  leaseEffectiveDate: string;
  leaseExpirationDate: string;
  realPropertyAssetType: string;
  // Computed fields
  leaseEffectiveDateParsed?: Date | null;
  leaseExpirationDateParsed?: Date | null;
  leaseDurationYears?: number;
  leaseStatus?: 'active' | 'expired' | 'upcoming';
  constructionDate?: number; // We'll need to derive this or leave as null
}

// Import the buildings loader from the existing API
async function loadBuildingsData() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/buildings`);
    if (!response.ok) {
      throw new Error('Failed to fetch buildings');
    }
    const data = await response.json();
    return data.buildings || [];
  } catch (error) {
    // Fallback to direct import if fetch fails (for server-side calls)
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    // TBuilding import removed as it's not used in this fallback
    
    // Use the same parsing logic as buildings API
    const csvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-buildings.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Simplified parsing for fallback
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim().replace(/"/g, '')] = values[index]?.trim().replace(/"/g, '') || '';
      });
      
      return {
        locationCode: obj['Location Code'] || '',
        realPropertyAssetName: obj['Real Property Asset Name'] || '',
        installationName: obj['Installation Name'] || '',
        ownedOrLeased: obj['Owned or Leased'] as 'F' | 'L',
        gsaRegion: Number(obj['GSA Region']) || 0,
        streetAddress: obj['Street Address'] || '',
        city: obj['City'] || '',
        state: obj['State'] || '',
        zipCode: Number(obj['Zip Code']) || 0,
        latitude: Number(obj['Latitude']) || 0,
        longitude: Number(obj['Longitude']) || 0,
        buildingRentableSquareFeet: Number(obj['Building Rentable Square Feet']) || 0,
        availableSquareFeet: Number(obj['Available Square Feet']) || 0,
        constructionDate: Number(obj['Construction Date']) || 0,
        congressionalDistrict: Number(obj['Congressional District']) || 0,
        congressionalDistrictRepresentativeName: obj['Congressional District Representative Name'] || '',
        buildingStatus: obj['Building Status'] || '',
        realPropertyAssetType: obj['Real Property Asset Type'] || '',
      };
    }).filter(building => building.locationCode && building.ownedOrLeased === 'L');
  }
}

// Function to parse date strings
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Handle various date formats
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Function to determine lease status
function getLeaseStatus(effectiveDate: Date | null | undefined, expirationDate: Date | null | undefined): 'active' | 'expired' | 'upcoming' {
  if (!effectiveDate || !expirationDate) return 'active'; // Default for missing dates
  
  const now = new Date();
  if (now < effectiveDate) return 'upcoming';
  if (now > expirationDate) return 'expired';
  return 'active';
}

// Function to calculate lease duration in years
function calculateLeaseDuration(effectiveDate: Date | null | undefined, expirationDate: Date | null | undefined): number {
  if (!effectiveDate || !expirationDate) return 0;
  
  const diffTime = expirationDate.getTime() - effectiveDate.getTime();
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
}

// Function to load lease records directly from CSV
function loadLeaseRecords(): LeaseRecord[] {
  try {
    const csvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-leased-properties.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log(`📋 CSV Headers (${headers.length}):`, headers);
    
    const records: LeaseRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV line handling quoted values
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Don't forget the last value
      
      // Create lease record object
      const record: LeaseRecord = {
        locationCode: values[0] || '',
        realPropertyAssetName: values[1] || '',
        installationName: values[2] || '',
        federalLeasedCode: values[3] || '',
        gsaRegion: Number(values[4]) || 0,
        streetAddress: values[5] || '',
        city: values[6] || '',
        state: values[7] || '',
        zipCode: Number(values[8]) || 0,
        latitude: Number(values[9]) || 0,
        longitude: Number(values[10]) || 0,
        buildingRentableSquareFeet: Number(values[11]) || 0,
        availableSquareFeet: Number(values[12]) || 0,
        congressionalDistrict: Number(values[13]) || 0,
        congressionalDistrictRepresentative: values[14] || '',
        leaseNumber: values[15] || '',
        leaseEffectiveDate: values[16] || '',
        leaseExpirationDate: values[17] || '',
        realPropertyAssetType: values[18] || '',
      };
      
      // Parse dates and calculate derived fields
      record.leaseEffectiveDateParsed = parseDate(record.leaseEffectiveDate);
      record.leaseExpirationDateParsed = parseDate(record.leaseExpirationDate);
      record.leaseDurationYears = calculateLeaseDuration(record.leaseEffectiveDateParsed, record.leaseExpirationDateParsed);
      record.leaseStatus = getLeaseStatus(record.leaseEffectiveDateParsed, record.leaseExpirationDateParsed);
      
      records.push(record);
    }
    
    console.log(`📋 Parsed ${records.length} lease records from CSV`);
    return records;
    
  } catch (error) {
    console.error('Error loading lease records:', error);
    return [];
  }
}

// Function to calculate statistics for lease records
function calculateLeaseStatistics(records: LeaseRecord[]) {
  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);
  
  const activeLeases = records.filter(r => r.leaseStatus === 'active').length;
  const expiredLeases = records.filter(r => r.leaseStatus === 'expired').length;
  const upcomingLeases = records.filter(r => r.leaseStatus === 'upcoming').length;
  
  const expiringSoon = records.filter(r => {
    if (!r.leaseExpirationDateParsed) return false;
    return r.leaseExpirationDateParsed > now && r.leaseExpirationDateParsed <= sixMonthsFromNow;
  }).length;
  
  const totalWithLeaseData = records.filter(r => r.leaseNumber && r.leaseNumber.trim() !== '').length;
  const avgLeaseDuration = records.length > 0 
    ? records.reduce((sum, r) => sum + (r.leaseDurationYears || 0), 0) / records.length 
    : 0;
  
  // Group by location to count unique buildings
  const uniqueBuildings = new Set(records.map(r => r.locationCode)).size;
  const buildingsWithMultipleLeases = records.reduce((acc, record) => {
    const buildingLeases = records.filter(r => r.locationCode === record.locationCode);
    if (buildingLeases.length > 1 && !acc.has(record.locationCode)) {
      acc.add(record.locationCode);
    }
    return acc;
  }, new Set()).size;
  
  return {
    totalBuildings: uniqueBuildings,
    totalLeases: records.length,
    totalWithLeaseData: totalWithLeaseData,
    activeLeases,
    expiredLeases,
    upcomingLeases,
    expiringSoon,
    avgLeaseDuration: Math.round(avgLeaseDuration * 10) / 10,
    leaseDataCoverage: uniqueBuildings > 0 ? (totalWithLeaseData / records.length) * 100 : 0,
    buildingsWithMultipleLeases,
    averageLeasesPerBuilding: uniqueBuildings > 0 ? records.length / uniqueBuildings : 0,
    maxLeasesPerBuilding: uniqueBuildings > 0 ? Math.max(...Array.from(new Set(records.map(r => r.locationCode)))
      .map(locationCode => records.filter(r => r.locationCode === locationCode).length)) : 0
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '999999');
    const format = searchParams.get('format') || 'enhanced'; // 'enhanced' for Gantt, 'raw' for table

    if (format === 'raw') {
      // Return raw lease records for the table
      const leaseRecords = loadLeaseRecords();
      console.log(`📋 Loaded ${leaseRecords.length} lease records from CSV`);

      // Apply limit if specified
      const limitedRecords = limit < 999999 ? leaseRecords.slice(0, limit) : leaseRecords;

      // Calculate statistics if requested
      let stats = null;
      if (includeStats) {
        stats = calculateLeaseStatistics(leaseRecords);
        console.log(`📊 Lease Statistics:`, stats);
      }

      return NextResponse.json({ 
        buildings: limitedRecords, // Keep the same field name for compatibility
        leases: limitedRecords,    // Also provide as 'leases' for clarity
        stats,
        total: leaseRecords.length,
        withLeaseData: leaseRecords.filter(r => r.leaseNumber && r.leaseNumber.trim() !== '').length,
        uniqueBuildings: new Set(leaseRecords.map(r => r.locationCode)).size
      });
    } else {
      // Return enhanced buildings for the Gantt chart (original functionality)
      const allBuildings = await loadBuildingsData();
      const leasedBuildings = allBuildings.filter((building: any) => building.ownedOrLeased === 'L');

      console.log(`📋 Processing ${leasedBuildings.length} leased buildings for multiple lease data enhancement`);

      // Enhance leased buildings with ALL lease data (multiple leases per building)
      const enhancedBuildings = enhanceLeasedBuildingsWithMultipleLeases(leasedBuildings);

      console.log(`✅ Enhanced ${enhancedBuildings.length} buildings with multiple lease data`);
      
      // Log some statistics about multiple leases
      const multiLeaseBuildings = enhancedBuildings.filter(b => b.leases.length > 1);
      console.log(`📊 Buildings with multiple leases: ${multiLeaseBuildings.length}`);
      if (multiLeaseBuildings.length > 0) {
        const maxLeases = Math.max(...enhancedBuildings.map(b => b.leases.length));
        console.log(`📊 Maximum leases per building: ${maxLeases}`);
      }

      // Apply limit if specified
      const limitedBuildings = limit < 999999 ? enhancedBuildings.slice(0, limit) : enhancedBuildings;

      // Calculate statistics if requested
      let stats = null;
      if (includeStats) {
        // Convert to single lease format for stats calculation (using primary lease)
        const singleLeaseBuildings = enhancedBuildings.map(building => ({
          ...building,
          leaseNumber: building.primaryLease?.leaseNumber,
          leaseEffectiveDate: building.primaryLease?.leaseEffectiveDate,
          leaseExpirationDate: building.primaryLease?.leaseExpirationDate,
          leaseEffectiveDateParsed: building.primaryLease?.leaseEffectiveDateParsed,
          leaseExpirationDateParsed: building.primaryLease?.leaseExpirationDateParsed,
          leaseDurationYears: building.primaryLease?.leaseDurationYears,
          leaseStatus: building.primaryLease?.leaseStatus
        }));
        
        stats = getLeaseStatistics(singleLeaseBuildings);
        
        // Add multiple lease specific stats
        (stats as any).buildingsWithMultipleLeases = multiLeaseBuildings.length;
        (stats as any).averageLeasesPerBuilding = enhancedBuildings.length > 0 
          ? enhancedBuildings.reduce((sum, b) => sum + b.leases.length, 0) / enhancedBuildings.length 
          : 0;
        (stats as any).maxLeasesPerBuilding = enhancedBuildings.length > 0 
          ? Math.max(...enhancedBuildings.map(b => b.leases.length)) 
          : 0;
        
        console.log(`📊 Enhanced Lease Statistics:`, stats);
      }

      return NextResponse.json({ 
        buildings: limitedBuildings,
        stats,
        total: enhancedBuildings.length,
        withLeaseData: enhancedBuildings.filter(b => b.leases.length > 0).length,
        withMultipleLeases: multiLeaseBuildings.length
      });
    }

  } catch (error) {
    console.error('Error in leases API:', error);
    return NextResponse.json(
      { error: 'Failed to load lease data' },
      { status: 500 }
    );
  }
}