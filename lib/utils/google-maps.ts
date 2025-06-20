import { Loader } from '@googlemaps/js-api-loader';

let googleMapsPromise: Promise<typeof google> | null = null;

export async function loadGoogleMaps(): Promise<typeof google> {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  if (window.google?.maps) {
    return window.google;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.');
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: ['places', 'geometry'],
  });

  try {
    googleMapsPromise = loader.load();
    const google = await googleMapsPromise;
    console.log('✅ Google Maps loaded successfully');
    return google;
  } catch (error) {
    console.error('❌ Failed to load Google Maps:', error);
    googleMapsPromise = null; // Reset promise so it can be retried
    throw error;
  }
}

export function createMarkerIcon(type: 'owned' | 'leased', isSelected = false): google.maps.Icon {
  const size = isSelected ? 32 : 24;
  const colors = {
    owned: { fill: '#10B981', stroke: '#059669' }, // Green shades
    leased: { fill: '#3B82F6', stroke: '#2563EB' }, // Blue shades
  };
  
  const color = colors[type];
  const strokeWidth = isSelected ? 3 : 2;
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
              fill="${color.fill}" 
              stroke="${color.stroke}" 
              stroke-width="${strokeWidth}"
              filter="url(#shadow)"/>
        <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        ${type === 'owned' 
          ? '<path d="M10.5 8.5h3v1h-3z" fill="#059669"/><path d="M11.5 7.5h1v3h-1z" fill="#059669"/>' 
          : '<rect x="10.5" y="7.5" width="3" height="3" rx="0.5" fill="#2563EB"/>'
        }
      </svg>`
    )}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  };
}

export function createClusterIcon(count: number, type: 'mixed' | 'owned' | 'leased'): google.maps.Icon {
  const size = Math.min(60, Math.max(40, 30 + Math.log10(count) * 10));
  const colors = {
    mixed: { bg: '#8B5CF6', text: '#fff' },
    owned: { bg: '#10B981', text: '#fff' },
    leased: { bg: '#3B82F6', text: '#fff' },
  };
  
  const color = colors[type];
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg width="${size}" height="${size}" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
          </filter>
        </defs>
        <circle cx="30" cy="30" r="25" fill="${color.bg}" stroke="#fff" stroke-width="3" filter="url(#shadow)"/>
        <text x="30" y="36" text-anchor="middle" fill="${color.text}" font-family="Arial, sans-serif" font-weight="bold" font-size="${count > 99 ? '12' : '14'}">${count > 999 ? '999+' : count}</text>
      </svg>`
    )}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export function fitMapToMarkers(
  map: google.maps.Map,
  markers: Array<{ lat: number; lng: number }>
): void {
  if (markers.length === 0) {
    // If no markers, center on USA
    map.setCenter({ lat: 39.8283, lng: -98.5795 });
    map.setZoom(4);
    return;
  }

  if (markers.length === 1) {
    // If only one marker, center on it with a reasonable zoom
    map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
    map.setZoom(12);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => {
    bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
  });

  map.fitBounds(bounds);

  // Ensure minimum zoom level for better UX
  const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
    const zoom = map.getZoom();
    if (zoom !== undefined && zoom > 15) {
      map.setZoom(15);
    }
    google.maps.event.removeListener(listener);
  });
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

export function createInfoWindowContent(property: {
  name: string;
  address: string;
  ownedOrLeased: 'F' | 'L';
  squareFootage: number;
  assetType: string;
}): string {
  const badgeColor = property.ownedOrLeased === 'F' ? '#10B981' : '#3B82F6';
  const badgeText = property.ownedOrLeased === 'F' ? 'Federal Owned' : 'Leased';
  
  return `
    <div style="max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="margin-bottom: 8px;">
        <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; line-height: 1.3; color: #1a202c;">
          ${property.name}
        </h3>
        <p style="margin: 0; font-size: 13px; color: #718096; line-height: 1.4;">
          📍 ${property.address}
        </p>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="background-color: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
          ${badgeText}
        </span>
        <span style="font-size: 13px; font-weight: 500; color: #4a5568;">
          ${property.squareFootage.toLocaleString()} sq ft
        </span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="font-size: 13px; color: #718096;">
          <strong>Asset Type:</strong> ${property.assetType}
        </span>
      </div>
      
      <div style="text-align: center;">
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}" 
           target="_blank" 
           style="color: #3182ce; font-size: 13px; text-decoration: none; font-weight: 500;">
          🗺️ View in Google Maps →
        </a>
      </div>
    </div>
  `;
}

// Utility to debounce function calls (useful for search/filter operations)
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 