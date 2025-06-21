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
  ButtonGroup,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import MainLayout from '@/app/components/layout/main-layout';
import LoadingProgress from '@/app/components/ui/loading-progress';
import { TMapMarker } from '@/types/property';

export default function MapPage() {
  const [mapLoading, setMapLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false); // Start as false since we're not loading data initially
  const [dataLoadingProgress, setDataLoadingProgress] = useState({ current: 0, total: 0, percentage: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [properties, setProperties] = useState<TMapMarker[]>([]);
  const [allProperties, setAllProperties] = useState<TMapMarker[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [markerProgress, setMarkerProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [currentDisplayedProperties, setCurrentDisplayedProperties] = useState<TMapMarker[]>([]);
  const [ownedMarkersVisible, setOwnedMarkersVisible] = useState(true);
  const [leasedMarkersVisible, setLeasedMarkersVisible] = useState(true);
  // New state for property info card
  const [selectedProperty, setSelectedProperty] = useState<TMapMarker | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadProperties = async (limitCount?: number) => {
    try {
      setDataLoading(true);
      setDataLoadingProgress({ current: 0, total: 100, percentage: 0, message: 'Initializing...' });
      
      const effectiveLimit = limitCount || displayLimit;
      addDebugInfo(`📊 Loading property data with limit: ${effectiveLimit}...`);
      
      // Progress: 10% - Starting data fetch
      setDataLoadingProgress({ current: 10, total: 100, percentage: 10, message: 'Connecting to database...' });
      
      // Dynamic import to avoid server-side execution
      const { getAllBuildingsForMap, getDataSourceInfo } = await import('@/lib/services/unified-data-service');
      
      // Progress: 20% - Service loaded
      const dataSourceInfo = getDataSourceInfo();
      setDataLoadingProgress({ current: 20, total: 100, percentage: 20, message: `Loading from ${dataSourceInfo.description}...` });
      
      let data: TMapMarker[];
      if (effectiveLimit >= 10000) {
        // For "All" option, load all properties
        addDebugInfo('📊 Loading ALL properties (no limit)...');
        setDataLoadingProgress({ current: 30, total: 100, percentage: 30, message: 'Loading all properties...' });
        const buildings = await getAllBuildingsForMap();
        data = buildings.map(building => ({
          id: building.locationCode,
          name: building.realPropertyAssetName,
          address: building.streetAddress,
          city: building.city,
          state: building.state,
          lat: building.latitude,
          lng: building.longitude,
          type: building.ownedOrLeased === 'F' ? 'owned' : 'leased',
          zipCode: building.zipCode?.toString() || '',
          constructionDate: building.constructionDate?.toString() || '',
          installationName: building.installationName || '',
          buildingRentableSquareFeet: building.buildingRentableSquareFeet || 0,
          realPropertyAssetType: building.realPropertyAssetType || ''
        }));
      } else {
        // For specific limits, load limited properties
        addDebugInfo(`📊 Loading ${effectiveLimit} properties (limited)...`);
        setDataLoadingProgress({ current: 30, total: 100, percentage: 30, message: `Loading ${effectiveLimit} properties...` });
        const buildings = await getAllBuildingsForMap(effectiveLimit);
        data = buildings.map(building => ({
          id: building.locationCode,
          name: building.realPropertyAssetName,
          address: building.streetAddress,
          city: building.city,
          state: building.state,
          lat: building.latitude,
          lng: building.longitude,
          type: building.ownedOrLeased === 'F' ? 'owned' : 'leased',
          zipCode: building.zipCode?.toString() || '',
          constructionDate: building.constructionDate?.toString() || '',
          installationName: building.installationName || '',
          buildingRentableSquareFeet: building.buildingRentableSquareFeet || 0,
          realPropertyAssetType: building.realPropertyAssetType || ''
        }));
      }
      
      // Progress: 60% - Data loaded
      setDataLoadingProgress({ current: 60, total: 100, percentage: 60, message: 'Processing property data...' });
      addDebugInfo(`✅ Loaded ${data.length} properties from ${dataSourceInfo.description}`);
      
      // Analyze coordinate data quality
      const validCoordinates = data.filter(prop => 
        prop.lat && prop.lng && 
        !isNaN(prop.lat) && !isNaN(prop.lng) &&
        prop.lat !== 0 && prop.lng !== 0
      );
      const invalidCoordinates = data.filter(prop => 
        !prop.lat || !prop.lng || 
        isNaN(prop.lat) || isNaN(prop.lng) ||
        prop.lat === 0 || prop.lng === 0
      );
      
      // Progress: 80% - Data processed
      setDataLoadingProgress({ current: 80, total: 100, percentage: 80, message: 'Validating coordinates...' });
      
      addDebugInfo(`📍 Coordinate Analysis:`);
      addDebugInfo(`  ✅ Valid coordinates: ${validCoordinates.length}`);
      addDebugInfo(`  ❌ Invalid/missing coordinates: ${invalidCoordinates.length}`);
      
      // Log some examples of invalid addresses for debugging
      if (invalidCoordinates.length > 0 && invalidCoordinates.length < 10) {
        addDebugInfo(`🔍 Invalid addresses:`);
        invalidCoordinates.forEach((prop, index) => {
          addDebugInfo(`  ${index + 1}. ${prop.name} - ${prop.address} (lat: ${prop.lat}, lng: ${prop.lng})`);
        });
      }
      
      // Progress: 90% - Almost done
      setDataLoadingProgress({ current: 90, total: 100, percentage: 90, message: 'Finalizing data...' });
      
      // Store both all properties and current subset
      setAllProperties(data);
      setProperties(data);
      
      // Progress: 100% - Complete
      setDataLoadingProgress({ current: 100, total: 100, percentage: 100, message: 'Data loaded successfully!' });
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDataLoading(false);
      
      // Add markers to map if map is ready - only use valid coordinates
      if (mapInstanceRef.current && validCoordinates.length > 0) {
        addMarkers(validCoordinates);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
      addDebugInfo(`❌ Data Error: ${errorMessage}`);
      setError(errorMessage);
      setDataLoading(false);
      setDataLoadingProgress({ current: 0, total: 100, percentage: 0, message: 'Error loading data' });
    }
  };

  const clearMarkers = () => {
    addDebugInfo(`🧹 Clearing ${markers.length} existing markers from map...`);
    
    // Remove all markers from the map and clear their references
    markers.forEach((marker, index) => {
      try {
        marker.setMap(null); // Remove from map
        marker.setVisible(false); // Ensure visibility is off
      } catch (error) {
        addDebugInfo(`⚠️ Error clearing marker ${index}: ${error}`);
      }
    });
    
    // Clear the markers array and displayed properties
    setMarkers([]);
    setCurrentDisplayedProperties([]);
    
    addDebugInfo(`✅ Map cleared - all markers removed`);
  };

  const addMarkers = async (propertyData: TMapMarker[], customLimit?: number) => {
    if (!mapInstanceRef.current) {
      addDebugInfo('❌ Cannot add markers - map not initialized');
      return;
    }
    
    // ALWAYS clear existing markers first - this ensures a clean slate
    addDebugInfo('🧹 Starting with clean map...');
    clearMarkers();
    
    // Reset current displayed properties to empty
    setCurrentDisplayedProperties([]);
    
    // Use custom limit if provided, otherwise use current displayLimit
    const effectiveLimit = customLimit !== undefined ? customLimit : displayLimit;
    const totalToProcess = Math.min(propertyData.length, effectiveLimit);
    
    addDebugInfo(`📍 Adding ${totalToProcess} new markers to clean map (limit: ${effectiveLimit})...`);
    
    // Start loading progress
    setIsLoadingMarkers(true);
    setMarkerProgress({ current: 0, total: totalToProcess, percentage: 0 });
    
    let ownedCount = 0;
    let leasedCount = 0;
    let validMarkerCount = 0;
    let invalidCoordCount = 0;
    const newMarkers: google.maps.Marker[] = [];
    const displayedProperties: TMapMarker[] = [];
    
    // Process markers in batches for better performance and smooth progress
    const batchSize = 10;
    let processedCount = 0;
    
    for (let i = 0; i < totalToProcess; i += batchSize) {
      const batch = propertyData.slice(i, Math.min(i + batchSize, totalToProcess));
      
      // Process batch
      for (const property of batch) {
        const index = i + batch.indexOf(property);
        
        // Validate coordinates before creating marker
        if (!property.lat || !property.lng || 
            isNaN(property.lat) || isNaN(property.lng) ||
            property.lat === 0 || property.lng === 0) {
          invalidCoordCount++;
          if (index < 5) { // Log first 5 invalid coordinates
            addDebugInfo(`❌ Invalid coords for: ${property.name} (lat: ${property.lat}, lng: ${property.lng})`);
          }
          processedCount++;
          continue;
        }
        
        const isOwned = property.ownedOrLeased === 'F';
        if (isOwned) ownedCount++;
        else leasedCount++;
        
        try {
          // Create all markers with map: null initially for consistent behavior
          const marker = new google.maps.Marker({
            position: { lat: property.lat, lng: property.lng },
            map: null, // Always start with null, then set visibility after creation
            title: `${property.name} (${isOwned ? 'Owned' : 'Leased'})`,
            visible: false, // Start invisible, then set proper visibility
          });
          
          // Set marker color based on ownership
          if (isOwned) {
            marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
          } else {
            marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');
          }
          
          // Add click event listener for property info card
          marker.addListener('click', () => {
            setSelectedProperty(property);
            setInfoWindowOpen(true);
            addDebugInfo(`🔍 Property selected: ${property.name}`);
          });
          
          // Now set proper visibility based on current toggle states
          const shouldBeVisible = isOwned ? ownedMarkersVisible : leasedMarkersVisible;
          if (shouldBeVisible) {
            marker.setMap(mapInstanceRef.current);
            marker.setVisible(true);
          }
          
          newMarkers.push(marker);
          displayedProperties.push(property);
          validMarkerCount++;
        } catch (error) {
          addDebugInfo(`❌ Failed to create marker for: ${property.name} - ${error}`);
        }
        
        processedCount++;
      }
      
      // Update progress after each batch
      const percentage = Math.round((processedCount / totalToProcess) * 100);
      setMarkerProgress({ 
        current: processedCount, 
        total: totalToProcess, 
        percentage 
      });
      
      // Small delay to allow UI to update and prevent blocking
      if (i + batchSize < totalToProcess) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Update state with new markers and properties
    setMarkers(newMarkers);
    setCurrentDisplayedProperties(displayedProperties);
    setIsLoadingMarkers(false);
    
    addDebugInfo(`✅ Marker Summary:`);
    addDebugInfo(`  📍 Valid markers created: ${validMarkerCount}`);
    addDebugInfo(`  👁️ Visible markers: ${newMarkers.filter(m => m.getVisible()).length}`);
    addDebugInfo(`  ❌ Invalid coordinates skipped: ${invalidCoordCount}`);
    addDebugInfo(`  🟢 Owned properties: ${ownedCount} (visible: ${ownedMarkersVisible})`);
    addDebugInfo(`  🔵 Leased properties: ${leasedCount} (visible: ${leasedMarkersVisible})`);
    addDebugInfo(`  🎯 Display limit used: ${effectiveLimit}`);
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
        // Enhanced map controls
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_CENTER,
          mapTypeIds: [
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.TERRAIN
          ]
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: google.maps.ControlPosition.RIGHT_TOP
        },
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT
        },
        scaleControl: true,
        rotateControl: true,
        // Improved styling
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;
      addDebugInfo('✅ Google Map created successfully');
      setMapLoading(false);
      
      // Map is ready - waiting for user to select properties to display
      addDebugInfo('🎯 Map ready - select "Show Properties" to load data');
      
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
    setAllProperties([]);
    initializeMap();
  };

  const changeDisplayLimit = async (newLimit: number) => {
    addDebugInfo(`🔢 Display limit changing from ${displayLimit} to ${newLimit}`);
    addDebugInfo(`📊 Before change - AllProperties: ${allProperties.length}, CurrentDisplayed: ${currentDisplayedProperties.length}`);
    
    setDisplayLimit(newLimit);
    
    // Reset visibility states to show both types when changing limits
    setOwnedMarkersVisible(true);
    setLeasedMarkersVisible(true);
    
    // Clear existing markers and data
    clearMarkers();
    
    // Fetch new data with the optimized limit - this will fetch only what we need from Firebase
    addDebugInfo(`🔄 Fetching new data with limit: ${newLimit}`);
    await loadProperties(newLimit);
    
    addDebugInfo(`📊 After change - AllProperties: ${allProperties.length}, CurrentDisplayed: ${currentDisplayedProperties.length}, DisplayLimit: ${displayLimit}`);
  };

  // Helper functions to get counts from current subset
  const getCurrentSubset = () => {
    // Since we now fetch exactly the number of properties we need,
    // use the currentDisplayedProperties which tracks what's actually on the map
    return currentDisplayedProperties.filter(prop => 
      prop.lat && prop.lng && 
      !isNaN(prop.lat) && !isNaN(prop.lng) &&
      prop.lat !== 0 && prop.lng !== 0
    );
  };

  const getOwnedCountInSubset = () => {
    return getCurrentSubset().filter(p => p.ownedOrLeased === 'F').length;
  };

  const getLeasedCountInSubset = () => {
    return getCurrentSubset().filter(p => p.ownedOrLeased === 'L').length;
  };

  // New function to toggle marker visibility without reloading data
  const toggleMarkerVisibility = (type: 'owned' | 'leased') => {
    addDebugInfo(`🔘 Toggle button clicked: ${type}`);
    addDebugInfo(`📊 Current state - Markers: ${markers.length}, Properties: ${currentDisplayedProperties.length}`);
    
    if (!mapInstanceRef.current) {
      addDebugInfo('❌ Cannot toggle markers - map not initialized');
      return;
    }
    
    if (type === 'owned') {
      const newVisibility = !ownedMarkersVisible;
      setOwnedMarkersVisible(newVisibility);
      addDebugInfo(`🟢 Setting owned markers visibility to: ${newVisibility}`);
      
      let toggledCount = 0;
      let errorCount = 0;
      
      // Toggle visibility of owned markers (green)
      markers.forEach((marker, index) => {
        try {
          const property = currentDisplayedProperties[index];
          if (property && property.ownedOrLeased === 'F') {
            if (newVisibility) {
              marker.setMap(mapInstanceRef.current);
              marker.setVisible(true);
            } else {
              marker.setMap(null);
              marker.setVisible(false);
            }
            toggledCount++;
          }
        } catch (error) {
          errorCount++;
          addDebugInfo(`⚠️ Error toggling owned marker ${index}: ${error}`);
        }
      });
      
      addDebugInfo(`🟢 Owned markers ${newVisibility ? 'shown' : 'hidden'} - Toggled: ${toggledCount}, Errors: ${errorCount}`);
    } else {
      const newVisibility = !leasedMarkersVisible;
      setLeasedMarkersVisible(newVisibility);
      addDebugInfo(`🔵 Setting leased markers visibility to: ${newVisibility}`);
      
      let toggledCount = 0;
      let errorCount = 0;
      
      // Toggle visibility of leased markers (blue)
      markers.forEach((marker, index) => {
        try {
          const property = currentDisplayedProperties[index];
          if (property && property.ownedOrLeased === 'L') {
            if (newVisibility) {
              marker.setMap(mapInstanceRef.current);
              marker.setVisible(true);
            } else {
              marker.setMap(null);
              marker.setVisible(false);
            }
            toggledCount++;
          }
        } catch (error) {
          errorCount++;
          addDebugInfo(`⚠️ Error toggling leased marker ${index}: ${error}`);
        }
      });
      
      addDebugInfo(`🔵 Leased markers ${newVisibility ? 'shown' : 'hidden'} - Toggled: ${toggledCount}, Errors: ${errorCount}`);
    }
  };

  // Function to open Google Street View
  const openStreetView = (property: TMapMarker) => {
    if (!property.lat || !property.lng) {
      addDebugInfo('❌ Cannot open Street View - invalid coordinates');
      return;
    }
    
    // Create Google Street View URL
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.lat},${property.lng}`;
    
    addDebugInfo(`🌍 Opening Street View for: ${property.name}`);
    window.open(streetViewUrl, '_blank');
  };

  // Function to close property info card
  const closePropertyCard = () => {
    setSelectedProperty(null);
    setInfoWindowOpen(false);
    addDebugInfo('🔍 Property card closed');
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
          <Text fontSize="sm" color="gray.600" mb={4}>
            {getCurrentSubset().length === 0 
              ? "Select 'Show Properties' to load government property data on the map" 
              : `Dynamic Filtering • ${getCurrentSubset().length} properties displayed (Owned: ${getOwnedCountInSubset()}, Leased: ${getLeasedCountInSubset()}) • Green = Owned, Blue = Leased`
            }
          </Text>
          
          {/* Filter Controls */}
          <HStack spacing={4} align="center">
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              Show:
            </Text>
            <ButtonGroup size="sm" variant="outline" colorScheme="blue">
              <Menu>
                <MenuButton 
                  as={Button}
                  rightIcon={<Text>▼</Text>}
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                >
                  Show Properties ({getCurrentSubset().length})
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => changeDisplayLimit(50)}>
                    Show 50 properties
                  </MenuItem>
                  <MenuItem onClick={() => changeDisplayLimit(500)}>
                    Show 500 properties
                  </MenuItem>
                  <MenuItem onClick={() => changeDisplayLimit(1000)}>
                    Show 1,000 properties
                  </MenuItem>
                  <MenuItem onClick={() => changeDisplayLimit(5000)}>
                    Show 5,000 properties
                  </MenuItem>
                  <MenuItem onClick={() => changeDisplayLimit(50000)}>
                    Show All properties
                  </MenuItem>
                </MenuList>
              </Menu>
              <Button
                isActive={ownedMarkersVisible}
                onClick={() => toggleMarkerVisibility('owned')}
                leftIcon={<Box w={2} h={2} bg="green.500" borderRadius="full" />}
                variant={ownedMarkersVisible ? "solid" : "outline"}
                colorScheme={ownedMarkersVisible ? "green" : "gray"}
              >
                Owned ({getOwnedCountInSubset()})
              </Button>
              <Button
                isActive={leasedMarkersVisible}
                onClick={() => toggleMarkerVisibility('leased')}
                leftIcon={<Box w={2} h={2} bg="blue.500" borderRadius="full" />}
                variant={leasedMarkersVisible ? "solid" : "outline"}
                colorScheme={leasedMarkersVisible ? "blue" : "gray"}
              >
                Leased ({getLeasedCountInSubset()})
              </Button>
            </ButtonGroup>
          </HStack>
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
          {/* Data Loading Progress - Green Progress Bar */}
          {dataLoading && (
            <Center 
              position="absolute" 
              top="0" 
              left="0" 
              right="0" 
              bottom="0" 
              zIndex={20} 
              bg="rgba(255,255,255,0.95)"
            >
              <Box w="400px" maxW="90%">
                <LoadingProgress
                  progress={dataLoadingProgress.percentage}
                  title="Loading Property Data"
                  subtitle={`${dataLoadingProgress.message}`}
                  message={`${dataLoadingProgress.percentage}% complete`}
                  showSpinner={true}
                  progressColor="green.500"
                />
              </Box>
            </Center>
          )}

          {/* Map Loading */}
          {(mapLoading && !dataLoading) && (
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
                <Text fontWeight="medium">Loading Google Maps...</Text>
                <Text fontSize="sm" color="gray.600">Initializing map interface</Text>
              </VStack>
            </Center>
          )}
          
          {/* Marker Loading Progress */}
          {isLoadingMarkers && (
            <Center 
              position="absolute" 
              top="0" 
              left="0" 
              right="0" 
              bottom="0" 
              zIndex={15} 
              bg="rgba(255,255,255,0.95)"
            >
              <Box w="400px" maxW="90%">
                <LoadingProgress
                  progress={markerProgress.percentage}
                  title="Loading Map Markers"
                  subtitle={`Processing ${markerProgress.current} of ${markerProgress.total} properties`}
                  message={`${markerProgress.percentage}% complete`}
                  showSpinner={true}
                />
              </Box>
            </Center>
          )}
          
          {/* Property Info Card */}
          {selectedProperty && infoWindowOpen && (
            <Box
              position="absolute"
              top="20px"
              right="20px"
              zIndex={25}
              bg="white"
              borderRadius="xl"
              shadow="2xl"
              border="1px"
              borderColor="gray.200"
              p={6}
              w="350px"
              maxW="90vw"
            >
              <VStack align="stretch" spacing={4}>
                {/* Header */}
                <HStack justify="space-between" align="flex-start">
                  <VStack align="stretch" spacing={1} flex={1}>
                    <Text fontSize="lg" fontWeight="bold" lineHeight="short">
                      {selectedProperty.name}
                    </Text>
                    <HStack spacing={2}>
                      <Box 
                        w={3} 
                        h={3} 
                        bg={selectedProperty.ownedOrLeased === 'F' ? 'green.500' : 'blue.500'} 
                        borderRadius="full" 
                      />
                      <Text fontSize="sm" color="gray.600" fontWeight="medium">
                        {selectedProperty.ownedOrLeased === 'F' ? 'Government Owned' : 'Leased Property'}
                      </Text>
                    </HStack>
                  </VStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={closePropertyCard}
                    aria-label="Close property card"
                  >
                    ✕
                  </Button>
                </HStack>
                
                {/* Property Details */}
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      📍 Address
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {selectedProperty.address}
                    </Text>
                  </Box>
                  
                  <HStack spacing={4}>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                        📐 Square Footage
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {selectedProperty.squareFootage?.toLocaleString() || 'N/A'} sq ft
                      </Text>
                    </Box>
                    
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                        🏢 Asset Type
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {selectedProperty.assetType || 'N/A'}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
                
                {/* Actions */}
                <HStack spacing={3}>
                  <Button
                    flex={1}
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Text>🌍</Text>}
                    onClick={() => openStreetView(selectedProperty)}
                  >
                    Street View
                  </Button>
                  <Button
                    flex={1}
                    variant="outline"
                    size="sm"
                    onClick={closePropertyCard}
                  >
                    Close
                  </Button>
                </HStack>
              </VStack>
            </Box>
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