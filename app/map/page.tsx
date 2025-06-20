'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Text,
  Spinner,
  Center,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Button,
} from '@chakra-ui/react';
import MainLayout from '@/app/components/layout/main-layout';
import { TMapMarker } from '@/types/property';

export default function MapPage() {
  const [mapLoading, setMapLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [properties, setProperties] = useState<TMapMarker[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadProperties = async () => {
    try {
      setDataLoading(true);
      addDebugInfo('📊 Loading property data...');
      
      // Dynamic import to avoid server-side execution
      const { getAllPropertiesForMap } = await import('@/lib/services/property-service');
      const data = await getAllPropertiesForMap();
      addDebugInfo(`✅ Loaded ${data.length} properties`);
      
      setProperties(data);
      setDataLoading(false);
      
      // Add markers to map if map is ready
      if (mapInstanceRef.current && data.length > 0) {
        addMarkers(data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
      addDebugInfo(`❌ Data Error: ${errorMessage}`);
      setError(errorMessage);
      setDataLoading(false);
    }
  };

  const addMarkers = (propertyData: TMapMarker[]) => {
    if (!mapInstanceRef.current) return;
    
    addDebugInfo(`📍 Adding ${propertyData.length} markers to map...`);
    
    let ownedCount = 0;
    let leasedCount = 0;
    
    // Add color-coded markers for each property
    propertyData.forEach((property, index) => {
      // Only add first 50 markers for testing
      if (index >= 50) return;
      
      const isOwned = property.ownedOrLeased === 'F';
      if (isOwned) ownedCount++;
      else leasedCount++;
      
      // Debug: Log first few properties to see their ownership status
      if (index < 5) {
        addDebugInfo(`Property ${index + 1}: ${property.name} - ownedOrLeased: "${property.ownedOrLeased}" - isOwned: ${isOwned}`);
      }
      
      const marker = new google.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        map: mapInstanceRef.current,
        title: `${property.name} (${isOwned ? 'Owned' : 'Leased'})`,
      });
      
      // Set marker color based on ownership
      if (isOwned) {
        // Green marker for owned properties
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
      } else {
        // Blue marker for leased properties  
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');
      }
    });
    
    addDebugInfo(`✅ Added ${Math.min(propertyData.length, 50)} markers: ${ownedCount} owned (green), ${leasedCount} leased (blue)`);
  };

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      setMapLoading(true);
      setError(null);
      addDebugInfo('🗺️ Starting Google Maps initialization...');
      
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not found in environment variables');
      }
      addDebugInfo(`✅ API key found: ${apiKey.substring(0, 10)}...`);

      // Load Google Maps script manually for better error handling
      addDebugInfo('📡 Loading Google Maps JavaScript API...');
      
      if (!window.google) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            addDebugInfo('✅ Google Maps script loaded successfully');
            resolve(true);
          };
          
          script.onerror = (error) => {
            addDebugInfo('❌ Failed to load Google Maps script');
            reject(new Error('Failed to load Google Maps JavaScript API'));
          };
          
          // Handle Google Maps API errors
          (window as any).gm_authFailure = () => {
            reject(new Error('Google Maps API authentication failed. Check your API key and billing.'));
          };
          
          document.head.appendChild(script);
        });
      } else {
        addDebugInfo('✅ Google Maps API already loaded');
      }

      addDebugInfo('🗺️ Creating map instance...');
      
      // Create the map
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      addDebugInfo('✅ Google Map created successfully');
      setMapLoading(false);
      
      // Load property data
      loadProperties();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addDebugInfo(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
      setMapLoading(false);
    }
  };

  const retryInitialization = () => {
    setDebugInfo([]);
    setProperties([]);
    initializeMap();
  };

  useEffect(() => {
    initializeMap();
  }, []);

  if (error) {
    return (
      <MainLayout title="Map View">
        <VStack spacing={4} align="stretch">
          <Alert status="error">
            <AlertIcon />
            <Box>
              <AlertTitle>Map Loading Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
          
          <Box p={4} bg="gray.50" borderRadius="lg">
            <Text fontWeight="bold" mb={2}>🔧 Debug Information:</Text>
            <VStack align="stretch" spacing={1}>
              {debugInfo.map((info, index) => (
                <Code key={index} fontSize="xs" p={1}>
                  {info}
                </Code>
              ))}
            </VStack>
          </Box>
          
          <Button onClick={retryInitialization} colorScheme="blue">
            Retry Loading Map
          </Button>
          
          <Box p={4} bg="blue.50" borderRadius="lg">
            <Text fontWeight="bold" mb={2}>💡 Troubleshooting Steps:</Text>
            <VStack align="stretch" spacing={1} fontSize="sm">
              <Text>1. Check if Maps JavaScript API is enabled in Google Cloud Console</Text>
              <Text>2. Verify API key has no domain restrictions blocking localhost</Text>
              <Text>3. Ensure billing is enabled for your Google Cloud project</Text>
              <Text>4. Check browser console for additional error details</Text>
            </VStack>
          </Box>
        </VStack>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Map View">
      <Box pr={6}>
        <Box mb={6}>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Government Property Map
          </Text>
          <Text fontSize="sm" color="gray.600">
            Step 2: Color-coded pins • {properties.length} properties loaded • Green = Owned, Blue = Leased
          </Text>
        </Box>

        {/* Map Container */}
        <Box 
          position="relative" 
          h="600px" 
          borderRadius="xl" 
          overflow="hidden" 
          shadow="lg" 
          border="1px" 
          borderColor="gray.200"
        >
          {(mapLoading || dataLoading) && (
            <Center 
              position="absolute" 
              top="0" 
              left="0" 
              right="0" 
              bottom="0" 
              zIndex={10} 
              bg="rgba(255,255,255,0.9)"
            >
              <VStack spacing={4}>
                <Spinner size="lg" color="blue.500" />
                <Text fontWeight="medium">
                  {mapLoading ? 'Loading Google Maps...' : 'Loading Properties...'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {mapLoading ? 'Initializing map interface' : `Fetching property data from Firestore`}
                </Text>
              </VStack>
            </Center>
          )}
          
          <Box
            ref={mapRef}
            h="100%"
            w="100%"
            bg="gray.100"
          />
        </Box>

        {/* Debug Info */}
        <Box mt={4} p={4} bg="gray.50" borderRadius="lg">
          <Text fontSize="sm" fontWeight="bold" mb={2}>🔧 Debug Information:</Text>
          <VStack align="stretch" spacing={1} maxH="200px" overflowY="auto">
            {debugInfo.map((info, index) => (
              <Code key={index} fontSize="xs" p={1}>
                {info}
              </Code>
            ))}
          </VStack>
          {debugInfo.length === 0 && (
            <Text fontSize="sm" color="gray.500">No debug information yet...</Text>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
} 