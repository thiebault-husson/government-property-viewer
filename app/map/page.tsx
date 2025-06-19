'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Text,
  Badge,
  Link,
  VStack,
  HStack,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import MainLayout from '@/app/components/layout/main-layout';
import { getAllPropertiesForMap } from '@/lib/services/property-service';
import { formatSquareFootage, getStreetViewUrl } from '@/lib/utils/data-helpers';
import { loadGoogleMaps, createMarkerIcon, fitMapToMarkers } from '@/lib/utils/google-maps';
import { TMapMarker } from '@/types/property';

export default function MapPage() {
  const [properties, setProperties] = useState<TMapMarker[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<TMapMarker[]>([]);
  const [filter, setFilter] = useState<'all' | 'owned' | 'leased'>('all');
  const [selectedProperty, setSelectedProperty] = useState<TMapMarker | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    let filtered = properties;
    if (filter === 'owned') {
      filtered = properties.filter(p => p.ownedOrLeased === 'F');
    } else if (filter === 'leased') {
      filtered = properties.filter(p => p.ownedOrLeased === 'L');
    }
    setFilteredProperties(filtered);
  }, [properties, filter]);

  useEffect(() => {
    if (mapInstanceRef.current && filteredProperties.length > 0) {
      updateMapMarkers();
    }
  }, [filteredProperties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getAllPropertiesForMap();
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      setMapLoading(true);
      await loadGoogleMaps();

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.HYBRID, // Show satellite imagery with labels
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_CENTER,
        },
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      setMapLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoading(false);
    }
  }, []);

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    const newMarkers = filteredProperties.map(property => {
      const marker = new google.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        map: mapInstanceRef.current,
        title: property.name,
        icon: createMarkerIcon(property.ownedOrLeased === 'F' ? 'owned' : 'leased'),
      });

      // Add click listener
      marker.addListener('click', () => {
        setSelectedProperty(property);
      });

      return marker;
    });

    markersRef.current = newMarkers;

    // Fit map to show all markers
    if (newMarkers.length > 0 && mapInstanceRef.current) {
      fitMapToMarkers(mapInstanceRef.current, filteredProperties);
    }
  };

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  if (loading) {
    return (
      <MainLayout title="Map View">
        <Center h="400px">
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Map View">
      <Box>
        <HStack justifyContent="space-between" alignItems="center" mb={6}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              onClick={() => setFilter('all')}
              colorScheme={filter === 'all' ? 'blue' : 'gray'}
            >
              All ({properties.length})
            </Button>
            <Button
              onClick={() => setFilter('owned')}
              colorScheme={filter === 'owned' ? 'green' : 'gray'}
            >
              Owned ({properties.filter(p => p.ownedOrLeased === 'F').length})
            </Button>
            <Button
              onClick={() => setFilter('leased')}
              colorScheme={filter === 'leased' ? 'blue' : 'gray'}
            >
              Leased ({properties.filter(p => p.ownedOrLeased === 'L').length})
            </Button>
          </ButtonGroup>

          <Text fontSize="sm" color="gray.600">
            Showing {filteredProperties.length} properties
          </Text>
        </HStack>

        <Box position="relative" h="600px" borderRadius="md" overflow="hidden">
          {mapLoading && (
            <Center position="absolute" top="0" left="0" right="0" bottom="0" zIndex={10} bg="gray.100">
              <VStack>
                <Spinner size="lg" />
                <Text>Loading Google Maps...</Text>
              </VStack>
            </Center>
          )}
          
          <Box
            ref={mapRef}
            h="100%"
            w="100%"
          />
          
          {selectedProperty && (
            <Card
              position="absolute"
              top="4"
              right="4"
              maxW="320px"
              zIndex={1000}
              shadow="lg"
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <Text fontWeight="bold" fontSize="md" noOfLines={2}>
                    {selectedProperty.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {selectedProperty.address}
                  </Text>
                  <HStack justify="space-between">
                    <Badge colorScheme={selectedProperty.ownedOrLeased === 'F' ? 'green' : 'blue'}>
                      {selectedProperty.ownedOrLeased === 'F' ? 'Owned' : 'Leased'}
                    </Badge>
                    <Text fontSize="sm">
                      {formatSquareFootage(selectedProperty.squareFootage)}
                    </Text>
                  </HStack>
                  <Text fontSize="sm">
                    <strong>Type:</strong> {selectedProperty.assetType}
                  </Text>
                  <HStack justify="space-between">
                    <Link
                      href={getStreetViewUrl(selectedProperty.address)}
                      isExternal
                      color="blue.500"
                      fontSize="sm"
                    >
                      Street View <ExternalLinkIcon mx="2px" />
                    </Link>
                    <Button
                      size="xs"
                      onClick={() => setSelectedProperty(null)}
                      variant="ghost"
                    >
                      Close
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          )}
        </Box>

        <Box mt={4}>
          <HStack justify="space-between" align="center">
            <Text fontSize="sm" color="gray.600">
              🗺️ Click markers for property details • Use map controls to switch between satellite and street view
            </Text>
            <HStack spacing={2} fontSize="xs">
              <HStack>
                <Box w="3" h="3" bg="green.500" borderRadius="full" />
                <Text>Owned</Text>
              </HStack>
              <HStack>
                <Box w="3" h="3" bg="blue.500" borderRadius="full" />
                <Text>Leased</Text>
              </HStack>
            </HStack>
          </HStack>
        </Box>
      </Box>
    </MainLayout>
  );
} 