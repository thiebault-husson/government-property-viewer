import { readFileSync } from 'fs';
import { join } from 'path';
import { TBuilding } from '@/types/property';

export interface LeaseData {
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
  leaseEffectiveDate: string; // Format: YYYY-MM-DD
  leaseExpirationDate: string; // Format: YYYY-MM-DD
  realPropertyAssetType: string;
}

export interface EnhancedLeasedBuilding extends TBuilding {
  leaseNumber?: string;
  leaseEffectiveDate?: string;
  leaseExpirationDate?: string;
  leaseEffectiveDateParsed?: Date | null;
  leaseExpirationDateParsed?: Date | null;
  leaseDurationYears?: number;
  leaseStatus?: 'active' | 'expired' | 'upcoming';
}

// Enhanced building interface with multiple lease data
export interface EnhancedLeasedBuildingWithMultipleLeases extends TBuilding {
  leases: {
    leaseNumber: string;
    leaseEffectiveDate: string;
    leaseExpirationDate: string;
    leaseEffectiveDateParsed: Date | null;
    leaseExpirationDateParsed: Date | null;
    leaseDurationYears: number;
    leaseStatus: 'active' | 'expired' | 'upcoming';
  }[];
  primaryLease?: {
    leaseNumber?: string;
    leaseEffectiveDate?: string;
    leaseExpirationDate?: string;
    leaseEffectiveDateParsed?: Date | null;
    leaseExpirationDateParsed?: Date | null;
    leaseDurationYears?: number;
    leaseStatus?: 'active' | 'expired' | 'upcoming';
  };
}

// Cache for parsed lease data
let leaseDataCache: LeaseData[] | null = null;

// Parse CSV line handling quoted fields with commas (consistent with buildings API)
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

// Parse CSV content handling the multi-line header format specific to leased properties CSV
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  
  // Handle the specific multi-line header format of the leased properties CSV
  // The headers are split across 4 lines in this format:
  // Line 1: "Location Code,Real Property Asset Name,Installation Name,Federal Leased Code,GSA Region,Street Address,City,"
  // Line 2: "State,Zip Code,Latitude,Longitude,Building Rentable Square Feet,Available Square Feet,Congressional District"
  // Line 3: ",Congressional District Representative,Lease Number,Lease Effective Date,Lease Expiration Date,Real Property"
  // Line 4: " Asset type"
  
  let headerLine = '';
  let dataStartIndex = 1;
  
  // Check if this is the multi-line format by looking for incomplete first line
  if (lines[0].endsWith(',') || lines.length > 1 && !lines[1].includes(',')) {
    // Multi-line header format - reconstruct the complete header
    headerLine = lines[0];
    if (!headerLine.endsWith(',')) headerLine += ',';
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check if this line contains data (has enough commas) or is still part of header
      const commaCount = (line.match(/,/g) || []).length;
      if (commaCount >= 15 && line.includes('PA0656')) { // First data line starts with PA0656
        dataStartIndex = i;
        break;
      } else {
        // Still part of header
        headerLine += line;
        if (!line.endsWith(',') && i < lines.length - 1) {
          headerLine += ',';
        }
      }
    }
  } else {
    // Standard single-line header format
    headerLine = lines[0];
    dataStartIndex = 1;
  }
  
  // Clean up header and split into individual headers
  headerLine = headerLine.replace(/,\s*$/, ''); // Remove trailing comma
  const headers = headerLine.split(',').map(h => h.trim());
  
  
  // Process data lines starting from dataStartIndex
  const results: any[] = [];
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      
      // Skip lines that don't have enough fields
      if (values.length < headers.length - 2) continue;
      
      const obj: any = {};
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/['"]/g, '').trim().replace(/[^\w\s]/g, '_').toLowerCase().replace(/\s+/g, '_');
        let value = values[index] || '';
        value = value.replace(/['"]/g, '').trim();
        
        // Handle empty values
        if (value === '' || value === 'NA' || value === 'N/A' || value === 'null') {
          obj[cleanHeader] = null;
        } else {
          obj[cleanHeader] = value.replace(/[\x00-\x1F\x7F]/g, '');
        }
      });
      
      if (obj.location_code) { // Only add records with location codes
        results.push(obj);
      }
    } catch (error) {
      console.warn(`Warning: Skipping line ${i + 1} due to parsing error:`, error);
    }
  }
  
  return results;
}

// Transform raw CSV row to LeaseData object
function transformToLeaseData(row: any): LeaseData | null {
  const cleanString = (value: any): string => {
    if (!value) return '';
    return String(value).replace(/[\x00-\x1F\x7F]/g, '').replace(/\0/g, '').trim();
  };

  const cleanNumber = (value: any): number => {
    if (!value || value === '' || value === 'N/A' || value === 'NA') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  try {
    return {
      locationCode: cleanString(row['location_code']),
      realPropertyAssetName: cleanString(row['real_property_asset_name']),
      installationName: cleanString(row['installation_name']),
      federalLeasedCode: cleanString(row['federal_leased_code']),
      gsaRegion: cleanNumber(row['gsa_region']),
      streetAddress: cleanString(row['street_address']),
      city: cleanString(row['city']),
      state: cleanString(row['state']),
      zipCode: cleanNumber(row['zip_code']),
      latitude: cleanNumber(row['latitude']),
      longitude: cleanNumber(row['longitude']),
      buildingRentableSquareFeet: cleanNumber(row['building_rentable_square_feet']),
      availableSquareFeet: cleanNumber(row['available_square_feet']),
      congressionalDistrict: cleanNumber(row['congressional_district']),
      congressionalDistrictRepresentative: cleanString(row['congressional_district_representative']),
      leaseNumber: cleanString(row['lease_number']),
      leaseEffectiveDate: cleanString(row['lease_effective_date']),
      leaseExpirationDate: cleanString(row['lease_expiration_date']),
      realPropertyAssetType: cleanString(row['real_property_asset_type'] || row['asset_type']),
    };
  } catch (error) {
    console.warn('Error transforming lease data row:', error);
    return null;
  }
}

// Load lease data from CSV
function loadLeaseData(): LeaseData[] {
  if (leaseDataCache) {
    return leaseDataCache;
  }

  try {
    const csvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-leased-properties.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const rawData = parseCSV(csvContent);
    
    leaseDataCache = rawData
      .map(transformToLeaseData)
      .filter((lease): lease is LeaseData => lease !== null && Boolean(lease.locationCode));
    
    return leaseDataCache;
  } catch (error) {
    console.error('Error loading lease CSV:', error);
    return [];
  }
}

// Parse date string to Date object
function parseLeaseDate(dateString: string): Date | null {
  if (!dateString || dateString === '' || dateString === 'N/A') return null;
  
  try {
    // Handle YYYY-MM-DD format
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

// Calculate lease status based on dates
function getLeaseStatus(effectiveDate: Date | null, expirationDate: Date | null): 'active' | 'expired' | 'upcoming' {
  const today = new Date();
  
  if (!effectiveDate || !expirationDate) return 'active'; // Default for invalid dates
  
  if (today < effectiveDate) return 'upcoming';
  if (today > expirationDate) return 'expired';
  return 'active';
}

// Calculate lease duration in years
function calculateLeaseDuration(effectiveDate: Date | null, expirationDate: Date | null): number {
  if (!effectiveDate || !expirationDate) return 0;
  
  const diffTime = expirationDate.getTime() - effectiveDate.getTime();
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
}

// Get all leases grouped by location code
function getLeasesByLocation(): Map<string, LeaseData[]> {
  const leaseData = loadLeaseData();
  const leasesByLocation = new Map<string, LeaseData[]>();
  
  leaseData.forEach(lease => {
    if (!leasesByLocation.has(lease.locationCode)) {
      leasesByLocation.set(lease.locationCode, []);
    }
    leasesByLocation.get(lease.locationCode)!.push(lease);
  });
  
  return leasesByLocation;
}

// Enhance leased buildings with ALL lease data (multiple leases per building)
export function enhanceLeasedBuildingsWithMultipleLeases(
  buildings: TBuilding[], 
  externalLeaseData?: any[]
): EnhancedLeasedBuildingWithMultipleLeases[] {
  // Use external lease data if provided, otherwise load from CSV
  let leasesByLocation: Map<string, LeaseData[]>;
  
  if (externalLeaseData && externalLeaseData.length > 0) {
    // Use external lease data (from Supabase)
    leasesByLocation = new Map<string, LeaseData[]>();
    externalLeaseData.forEach(lease => {
      const locationCode = lease.locationCode;
      if (!leasesByLocation.has(locationCode)) {
        leasesByLocation.set(locationCode, []);
      }
      leasesByLocation.get(locationCode)!.push(lease);
    });
  } else {
    // Load from CSV as fallback
    leasesByLocation = getLeasesByLocation();
  }
  
  return buildings.map(building => {
    const leases = leasesByLocation.get(building.locationCode) || [];
    
    if (leases.length === 0) {
      // Return building without lease data
      return {
        ...building,
        leases: [],
        primaryLease: {
          leaseStatus: 'active' as const
        }
      };
    }

    // Process all leases for this location
    const processedLeases = leases.map(lease => {
      const effectiveDate = parseLeaseDate(lease.leaseEffectiveDate);
      const expirationDate = parseLeaseDate(lease.leaseExpirationDate);
      const leaseStatus = getLeaseStatus(effectiveDate, expirationDate);
      const leaseDuration = calculateLeaseDuration(effectiveDate, expirationDate);

      return {
        leaseNumber: lease.leaseNumber,
        leaseEffectiveDate: lease.leaseEffectiveDate,
        leaseExpirationDate: lease.leaseExpirationDate,
        leaseEffectiveDateParsed: effectiveDate,
        leaseExpirationDateParsed: expirationDate,
        leaseDurationYears: leaseDuration,
        leaseStatus
      };
    });

    // Determine primary lease with better logic
    // Priority: 1) Active lease with latest start date, 2) Future lease, 3) Most recent expired lease
    const activeLeases = processedLeases.filter(l => l.leaseStatus === 'active');
    const upcomingLeases = processedLeases.filter(l => l.leaseStatus === 'upcoming');
    const expiredLeases = processedLeases.filter(l => l.leaseStatus === 'expired');
    
    let primaryLease;
    if (activeLeases.length > 0) {
      // Among active leases, pick the one with the latest start date (most recent)
      primaryLease = activeLeases.reduce((latest, current) => 
        (current.leaseEffectiveDateParsed && latest.leaseEffectiveDateParsed && 
         current.leaseEffectiveDateParsed > latest.leaseEffectiveDateParsed) ? current : latest
      );
    } else if (upcomingLeases.length > 0) {
      // Pick the upcoming lease with earliest start date
      primaryLease = upcomingLeases.reduce((earliest, current) => 
        (current.leaseEffectiveDateParsed && earliest.leaseEffectiveDateParsed && 
         current.leaseEffectiveDateParsed < earliest.leaseEffectiveDateParsed) ? current : earliest
      );
    } else if (expiredLeases.length > 0) {
      // Pick the most recently expired lease
      primaryLease = expiredLeases.reduce((latest, current) => 
        (current.leaseExpirationDateParsed && latest.leaseExpirationDateParsed && 
         current.leaseExpirationDateParsed > latest.leaseExpirationDateParsed) ? current : latest
      );
    } else {
      // Fallback to longest lease
      primaryLease = processedLeases.reduce((longest, current) => 
        (current.leaseDurationYears > longest.leaseDurationYears) ? current : longest
      );
    }

    return {
      ...building,
      leases: processedLeases,
      primaryLease: {
        leaseNumber: primaryLease.leaseNumber,
        leaseEffectiveDate: primaryLease.leaseEffectiveDate,
        leaseExpirationDate: primaryLease.leaseExpirationDate,
        leaseEffectiveDateParsed: primaryLease.leaseEffectiveDateParsed,
        leaseExpirationDateParsed: primaryLease.leaseExpirationDateParsed,
        leaseDurationYears: primaryLease.leaseDurationYears,
        leaseStatus: primaryLease.leaseStatus
      }
    };
  });
}

// Get lease statistics
export function getLeaseStatistics(enhancedBuildings: EnhancedLeasedBuilding[]) {
  const withLeaseData = enhancedBuildings.filter(b => b.leaseNumber);
  const totalLeases = withLeaseData.length;
  
  const activeLeases = withLeaseData.filter(b => b.leaseStatus === 'active').length;
  const expiredLeases = withLeaseData.filter(b => b.leaseStatus === 'expired').length;
  const upcomingLeases = withLeaseData.filter(b => b.leaseStatus === 'upcoming').length;
  
  // Calculate average lease duration
  const leasesWithDuration = withLeaseData.filter(b => b.leaseDurationYears && b.leaseDurationYears > 0);
  const avgLeaseDuration = leasesWithDuration.length > 0 
    ? leasesWithDuration.reduce((sum, b) => sum + (b.leaseDurationYears || 0), 0) / leasesWithDuration.length
    : 0;

  // Find leases expiring soon (within 2 years)
  const today = new Date();
  const twoYearsFromNow = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const expiringSoon = withLeaseData.filter(b => 
    b.leaseExpirationDateParsed && 
    b.leaseExpirationDateParsed > today && 
    b.leaseExpirationDateParsed <= twoYearsFromNow
  ).length;

  return {
    totalBuildings: enhancedBuildings.length,
    totalWithLeaseData: totalLeases,
    activeLeases,
    expiredLeases,
    upcomingLeases,
    expiringSoon,
    avgLeaseDuration: Math.round(avgLeaseDuration * 10) / 10,
    leaseDataCoverage: enhancedBuildings.length > 0 ? (totalLeases / enhancedBuildings.length * 100) : 0
  };
}

// Export for use in API routes
export { loadLeaseData }; 