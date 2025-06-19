import { TOwnedProperty, TLeasedProperty, TChartData, TDashboardStats } from '@/types/property';

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format square footage
export function formatSquareFootage(sqft: number): string {
  if (sqft >= 1000000) {
    return `${(sqft / 1000000).toFixed(1)}M sq ft`;
  } else if (sqft >= 1000) {
    return `${(sqft / 1000).toFixed(1)}K sq ft`;
  }
  return `${sqft} sq ft`;
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

// Group owned properties by construction date (decade)
export function groupOwnedPropertiesByDecade(properties: TOwnedProperty[]): TChartData[] {
  const decades: { [key: string]: number } = {};
  
  properties.forEach(property => {
    if (property.constructionDate && property.constructionDate !== 'N/A') {
      const year = parseInt(property.constructionDate);
      if (!isNaN(year)) {
        const decade = Math.floor(year / 10) * 10;
        const decadeLabel = `${decade}s`;
        decades[decadeLabel] = (decades[decadeLabel] || 0) + 1;
      }
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

// Calculate dashboard statistics for owned properties
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

  const totalSquareFootage = properties.reduce(
    (sum, prop) => sum + (prop.buildingRentableSquareFeet || 0),
    0
  );

  const propertiesWithDates = properties.filter(
    prop => prop.constructionDate && prop.constructionDate !== 'N/A'
  );

  let oldestBuilding = 'N/A';
  let newestBuilding = 'N/A';

  if (propertiesWithDates.length > 0) {
    const sorted = propertiesWithDates.sort((a, b) => {
      const yearA = parseInt(a.constructionDate);
      const yearB = parseInt(b.constructionDate);
      return yearA - yearB;
    });

    oldestBuilding = `${sorted[0].realPropertyAssetName} (${sorted[0].constructionDate})`;
    newestBuilding = `${sorted[sorted.length - 1].realPropertyAssetName} (${sorted[sorted.length - 1].constructionDate})`;
  }

  return {
    totalProperties: properties.length,
    totalSquareFootage,
    averageSquareFootage: Math.round(totalSquareFootage / properties.length),
    oldestBuilding,
    newestBuilding,
  };
}

// Calculate rentable vs available square footage
export function calculateSquareFootageData(properties: TOwnedProperty[]): TChartData[] {
  const totalRentable = properties.reduce(
    (sum, prop) => sum + (prop.buildingRentableSquareFeet || 0),
    0
  );
  
  const totalAvailable = properties.reduce(
    (sum, prop) => sum + (prop.availableSquareFeet || 0),
    0
  );

  const totalOccupied = totalRentable - totalAvailable;

  return [
    {
      name: 'Occupied',
      value: totalOccupied,
      percentage: totalRentable > 0 ? Math.round((totalOccupied / totalRentable) * 100) : 0,
    },
    {
      name: 'Available',
      value: totalAvailable,
      percentage: totalRentable > 0 ? Math.round((totalAvailable / totalRentable) * 100) : 0,
    },
  ];
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