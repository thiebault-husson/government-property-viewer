import { TOwnedProperty, TLeasedProperty, TChartData, TDashboardStats } from '@/types/property';

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// Format square footage
export function formatSquareFootage(sqft: number): string {
  if (sqft >= 1000000) {
    return `${(sqft / 1000000).toFixed(1)}M sq ft`;
  } else if (sqft >= 1000) {
    return `${(sqft / 1000).toFixed(0)}K sq ft`;
  } else {
    return `${sqft.toFixed(0)} sq ft`;
  }
}

// Format date
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Group owned properties by construction decade for charts
export function groupBuildingsByDecade(buildings: TOwnedProperty[]): TChartData[] {
  const decades: { [key: string]: number } = {};
  
  buildings.forEach(building => {
    if (building.constructionDate && typeof building.constructionDate === 'number') {
      const decade = Math.floor(building.constructionDate / 10) * 10;
      const decadeLabel = `${decade}s`;
      decades[decadeLabel] = (decades[decadeLabel] || 0) + 1;
    }
  });

  return Object.entries(decades)
    .map(([decade, count]) => ({
      name: decade,
      value: count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Group properties by state
export function groupPropertiesByState(
  ownedProperties: TOwnedProperty[],
  leasedProperties: TLeasedProperty[]
): TChartData[] {
  const states: { [key: string]: { owned: number; leased: number } } = {};
  
  ownedProperties.forEach(property => {
    if (!states[property.state]) {
      states[property.state] = { owned: 0, leased: 0 };
    }
    states[property.state].owned += 1;
  });

  leasedProperties.forEach(property => {
    if (!states[property.state]) {
      states[property.state] = { owned: 0, leased: 0 };
    }
    states[property.state].leased += 1;
  });

  return Object.entries(states)
    .map(([state, counts]) => ({
      name: state,
      owned: counts.owned,
      leased: counts.leased,
      total: counts.owned + counts.leased,
      value: counts.owned + counts.leased,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 states
}

// Calculate statistics for owned properties dashboard
export function calculateOwnedPropertyStats(properties: TOwnedProperty[]): TDashboardStats {
  if (properties.length === 0) {
    return {
      totalProperties: 0,
      totalSquareFootage: 0,
      averageSquareFootage: 0,
      oldestBuilding: 'N/A',
      newestBuilding: 'N/A',
    };
  }

  const totalProperties = properties.length;
  const totalSquareFootage = properties.reduce((sum, prop) => {
    return sum + (prop.buildingRentableSquareFeet || 0);
  }, 0);
  const averageSquareFootage = totalProperties > 0 ? totalSquareFootage / totalProperties : 0;
  
  // Find oldest and newest buildings
  const propertiesWithDates = properties.filter(
    prop => prop.constructionDate && typeof prop.constructionDate === 'number'
  );
  
  let oldestBuilding = 'N/A';
  let newestBuilding = 'N/A';
  
  if (propertiesWithDates.length > 0) {
    const sorted = propertiesWithDates.sort((a, b) => 
      (a.constructionDate as number) - (b.constructionDate as number)
    );
    
    oldestBuilding = `${sorted[0].realPropertyAssetName} (${sorted[0].constructionDate})`;
    newestBuilding = `${sorted[sorted.length - 1].realPropertyAssetName} (${sorted[sorted.length - 1].constructionDate})`;
  }
  
  return {
    totalProperties,
    totalSquareFootage,
    averageSquareFootage,
    oldestBuilding,
    newestBuilding,
  };
}

// Calculate rentable vs available square footage
export function calculateSquareFootageData(properties: TOwnedProperty[]): TChartData[] {
  const data: TChartData[] = [];
  let utilized = 0;
  let available = 0;
  
  properties.forEach(property => {
    const totalSpace = property.buildingRentableSquareFeet || 0;
    const availableSpace = property.availableSquareFeet || 0;
    const utilizedSpace = totalSpace - availableSpace;
    
    utilized += utilizedSpace > 0 ? utilizedSpace : totalSpace;
    available += availableSpace;
  });
  
  if (utilized > 0) {
    data.push({ name: 'Utilized Space', value: utilized });
  }
  if (available > 0) {
    data.push({ name: 'Available Space', value: available });
  }
  
  return data;
}

// Filter properties by search term
export function filterPropertiesBySearch<T extends { realPropertyAssetName: string; city: string; state: string }>(
  properties: T[],
  searchTerm: string
): T[] {
  if (!searchTerm) return properties;
  
  const term = searchTerm.toLowerCase();
  return properties.filter(
    property =>
      property.realPropertyAssetName.toLowerCase().includes(term) ||
      property.city.toLowerCase().includes(term) ||
      property.state.toLowerCase().includes(term)
  );
}

// Generate Google Street View URL
export function getStreetViewUrl(address: string): string {
  const baseUrl = 'https://www.google.com/maps/search/';
  return `${baseUrl}${encodeURIComponent(address)}`;
}

// Calculate space utilization for owned properties
export function calculateSpaceUtilization(
  buildings: TOwnedProperty[],
  leasedProperties: TLeasedProperty[]
): TChartData[] {
  const data: TChartData[] = [];
  
  // Calculate for owned properties
  buildings.forEach(building => {
    const totalSpace = building.buildingRentableSquareFeet;
    const availableSpace = building.availableSquareFeet;
    const utilizedSpace = totalSpace - availableSpace;
    
    if (totalSpace > 0) {
      data.push({
        name: 'Utilized Space',
        value: utilizedSpace,
      });
      
      if (availableSpace > 0) {
        data.push({
          name: 'Available Space',
          value: availableSpace,
        });
      }
    }
  });
  
  return data;
}

// Alias for compatibility
export const formatSquareFeet = formatSquareFootage; 