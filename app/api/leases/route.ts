import { NextRequest, NextResponse } from 'next/server';
import { enhanceLeasedBuildingsWithMultipleLeases, getLeaseStatistics, EnhancedLeasedBuildingWithMultipleLeases } from '@/lib/services/lease-data-service';

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
    const { TBuilding } = await import('@/types/property');
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '999999');

    // Load all buildings and filter for leased ones
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
      stats.buildingsWithMultipleLeases = multiLeaseBuildings.length;
      stats.averageLeasesPerBuilding = enhancedBuildings.length > 0 
        ? enhancedBuildings.reduce((sum, b) => sum + b.leases.length, 0) / enhancedBuildings.length 
        : 0;
      stats.maxLeasesPerBuilding = enhancedBuildings.length > 0 
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

  } catch (error) {
    console.error('Error in leases API:', error);
    return NextResponse.json(
      { error: 'Failed to load lease data' },
      { status: 500 }
    );
  }
} 