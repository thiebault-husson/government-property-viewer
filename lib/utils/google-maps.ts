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
    throw new Error('Google Maps API key is not configured');
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: ['places', 'geometry'],
  });

  googleMapsPromise = loader.load();
  return googleMapsPromise;
}

export function createMarkerIcon(type: 'owned' | 'leased'): google.maps.Icon {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${
          type === 'owned' ? '#10B981' : '#3B82F6'
        }" stroke="#fff" stroke-width="2"/>
        <circle cx="12" cy="9" r="2.5" fill="#fff"/>
      </svg>`
    )}`,
    scaledSize: new google.maps.Size(24, 24),
    anchor: new google.maps.Point(12, 24),
  };
}

export function fitMapToMarkers(
  map: google.maps.Map,
  markers: Array<{ lat: number; lng: number }>
): void {
  if (markers.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => {
    bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
  });

  map.fitBounds(bounds);

  // Ensure minimum zoom level
  const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
    if (map.getZoom()! > 15) map.setZoom(15);
    google.maps.event.removeListener(listener);
  });
} 