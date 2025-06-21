'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Text,
  Spinner,
  Center,
  VStack,
  SimpleGrid,
  Heading,
  Badge,
  Card,
  CardBody,
  Divider,
  HStack,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Flex,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { FiHome, FiTrendingUp, FiMapPin, FiCalendar } from 'react-icons/fi';
import MainLayout from '@/app/components/layout/main-layout';
import LoadingProgress from '@/app/components/ui/loading-progress';
import {
  groupBuildingsByDecade,
  calculateOwnedPropertyStats,
  calculateSquareFootageData,
  formatNumber,
  formatSquareFootage,
} from '@/lib/utils/data-helpers';
import { TBuilding } from '@/types/property';

// Modern color palette following design guidelines
const CHART_COLORS = {
  primary: '#2563eb',
  secondary: '#10b981', 
  accent: '#f59e0b',
  warning: '#ef4444',
  gradient: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']
};

// Custom stat card component following modern design principles
const StatCard = ({ 
  label, 
  value, 
  helpText, 
  icon, 
  color = 'blue',
  isLoading = false 
}: {
  label: string;
  value: string | number;
  helpText: string;
  icon: any;
  color?: string;
  isLoading?: boolean;
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" _hover={{ shadow: 'md' }} transition="all 0.2s">
      <CardBody p={6}>
        <Flex align="center" justify="space-between" mb={3}>
          <Box
            p={3}
            bg={`${color}.50`}
            borderRadius="xl"
            color={`${color}.600`}
          >
            <Icon as={icon} boxSize={6} />
          </Box>
          {isLoading && <Spinner size="sm" color={`${color}.500`} />}
        </Flex>
        
        <VStack align="stretch" spacing={1}>
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="gray.900">
            {isLoading ? '...' : value}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {helpText}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
};

// Custom chart container with modern styling
const ChartContainer = ({ 
  title, 
  children, 
  isLoading = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  isLoading?: boolean;
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
      <CardBody p={6}>
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="md" color="gray.900">
              {title}
            </Heading>
            {isLoading && <Spinner size="sm" />}
          </Flex>
          
          {isLoading ? (
            <Center h="300px">
              <VStack spacing={4}>
                <Spinner size="lg" color="blue.500" />
                <Text fontSize="sm" color="gray.500">Loading chart data...</Text>
              </VStack>
            </Center>
          ) : (
            <Box h="300px">
              {children}
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

// Map container for owned properties with hoverable pins
const OwnedPropertiesMap = ({ 
  buildings, 
  isLoading = false 
}: { 
  buildings: TBuilding[]; 
  isLoading?: boolean;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const initializeMap = useCallback(async () => {
    if (!mapRef.current || mapLoaded) return;

    try {
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // Load Google Maps script if not already loaded
      if (!window.google) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('Failed to load Google Maps'));
          document.head.appendChild(script);
        });
      }

      // Create map instance
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Create info window
      infoWindowRef.current = new google.maps.InfoWindow();

      setMapLoaded(true);
      setMapError(null);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to initialize map');
    }
  }, [mapLoaded]);

  const addMarkersToMap = useCallback(() => {
    if (!mapInstanceRef.current || !buildings.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Filter buildings with valid coordinates
    const validBuildings = buildings.filter(building => 
      building.latitude && 
      building.longitude && 
      building.latitude !== 0 && 
      building.longitude !== 0
    );

    // Add markers for owned properties only
    validBuildings.forEach(building => {
      const marker = new google.maps.Marker({
        position: { lat: building.latitude, lng: building.longitude },
        map: mapInstanceRef.current,
        title: building.realPropertyAssetName,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', // Green for owned
      });

      // Add hover tooltip
      marker.addListener('mouseover', () => {
        if (infoWindowRef.current) {
          const content = `
            <div style="padding: 8px; max-width: 300px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                ${building.realPropertyAssetName}
              </h3>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Building Status:</strong> ${building.buildingStatus || 'N/A'}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Building Type:</strong> ${building.realPropertyAssetType || 'N/A'}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Congressional District Rep:</strong> ${building.congressionalDistrictRepresentativeName || 'N/A'}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Location:</strong> ${building.city}, ${building.state}
              </p>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      });

      markersRef.current.push(marker);
    });
  }, [buildings]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    if (mapLoaded && buildings.length > 0) {
      addMarkersToMap();
    }
  }, [mapLoaded, buildings, addMarkersToMap]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
      <CardBody p={6}>
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="md" color="gray.900">
              Owned Properties Map
            </Heading>
            {isLoading && <Spinner size="sm" />}
          </Flex>
          
          <Box 
            h="400px" 
            borderRadius="lg" 
            overflow="hidden"
            position="relative"
            bg="gray.100"
          >
            {mapError ? (
              <Center h="100%">
                <VStack spacing={3}>
                  <Text color="red.500" fontSize="sm">
                    {mapError}
                  </Text>
                  <Button size="sm" onClick={() => {
                    setMapError(null);
                    setMapLoaded(false);
                    initializeMap();
                  }}>
                    Retry
                  </Button>
                </VStack>
              </Center>
            ) : !mapLoaded ? (
              <Center h="100%">
                <VStack spacing={3}>
                  <Spinner color="blue.500" />
                  <Text fontSize="sm" color="gray.500">Loading map...</Text>
                </VStack>
              </Center>
            ) : null}
            
            <Box ref={mapRef} h="100%" w="100%" />
          </Box>
          
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Hover over green pins to see building details • {buildings.filter(b => b.latitude && b.longitude && b.latitude !== 0 && b.longitude !== 0).length} properties with valid coordinates
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default function OwnedPropertiesDashboard() {
  // State for federally-owned buildings (filtered from buildings collection where ownedOrLeased = 'F')
  const [federalOwnedBuildings, setFederalOwnedBuildings] = useState<TBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // Calculate real-time stats as data loads
  const federalOwnedStats = calculateOwnedPropertyStats(federalOwnedBuildings);
  const constructionDecadeData = groupBuildingsByDecade(federalOwnedBuildings);
  const spaceUtilizationData = calculateSquareFootageData(federalOwnedBuildings, 'owned');

  const loadOwnedProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(10);
      setLoadingMessage('Loading building data...');

      // Dynamic import to use unified data service
      const { getAllBuildingsForMap, getDataSourceInfo } = await import('@/lib/services/unified-data-service');
      
      setLoadingProgress(30);
      setLoadingMessage('Fetching all buildings...');
      
      const dataSourceInfo = getDataSourceInfo();
      console.log(`📊 Loading from ${dataSourceInfo.description}`);
      
      const allBuildings = await getAllBuildingsForMap();
      
      setLoadingProgress(60);
      setLoadingMessage('Filtering owned properties...');
      
      // Filter for federally owned buildings only
      const ownedBuildings = allBuildings.filter(building => building.ownedOrLeased === 'F');
      
      console.log(`📊 Data Analysis:`);
      console.log(`  Total buildings: ${allBuildings.length}`);
      console.log(`  Owned buildings: ${ownedBuildings.length}`);
      console.log(`  Leased buildings: ${allBuildings.filter(b => b.ownedOrLeased === 'L').length}`);
      
      setLoadingProgress(90);
      setLoadingMessage('Processing dashboard data...');
      
      setFederalOwnedBuildings(ownedBuildings);
      
      setLoadingProgress(100);
      setLoadingMessage('Dashboard loaded successfully!');
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Error loading owned properties:', error);
      setError(`Failed to load owned properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoadingProgress(0);
      setLoadingMessage('Error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwnedProperties();
  }, [loadOwnedProperties]);

  if (loading) {
    return (
      <MainLayout title="Owned Properties Dashboard">
        <LoadingProgress
          progress={loadingProgress}
          message={loadingMessage}
          title="Loading Federal Owned Properties"
          subtitle="Fetching government-owned building data..."
        />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Owned Properties Dashboard">
        <Container maxW="7xl" py={8}>
          <VStack spacing={6}>
            <Alert status="error">
              <AlertIcon />
              <Box>
                <AlertTitle>Error Loading Owned Properties</AlertTitle>
                <AlertDescription>
                  <Text mb={2}>{error}</Text>
                </AlertDescription>
              </Box>
            </Alert>
            <Button onClick={loadOwnedProperties} colorScheme="blue">
              Retry Loading
            </Button>
          </VStack>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Owned Properties Dashboard">
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          
          {/* Header Section - Clean typography hierarchy */}
          <Box>
            <VStack spacing={3} align="stretch">
              <HStack spacing={3} align="center">
                <Icon as={FiHome} boxSize={8} color="blue.600" />
                <VStack align="start" spacing={0}>
                  <Heading size="xl" color="gray.900" fontWeight="bold">
                    Federal Owned Properties
                  </Heading>
                  <Text color="gray.600" fontSize="lg">
                    Government-owned building portfolio analytics
                  </Text>
                </VStack>
              </HStack>
              
              <HStack spacing={3}>
                <Badge colorScheme="blue" px={3} py={1} borderRadius="full" fontSize="sm">
                  Federal Properties Only
                </Badge>
                <Badge colorScheme="green" px={3} py={1} borderRadius="full" fontSize="sm">
                  {formatNumber(federalOwnedStats.totalProperties)} Buildings
                </Badge>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Key Metrics - Modern stat cards with icons */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StatCard
              icon={FiHome}
              label="Total Properties"
              value={formatNumber(federalOwnedStats.totalProperties)}
              helpText="Government-owned buildings"
              color="blue"
            />
            
            <StatCard
              icon={FiTrendingUp}
              label="Total Square Footage"
              value={formatSquareFootage(federalOwnedStats.totalSquareFootage)}
              helpText="Federal rentable space"
              color="green"
            />
            
            <StatCard
              icon={FiMapPin}
              label="Average Building Size"
              value={formatSquareFootage(federalOwnedStats.averageSquareFootage)}
              helpText="Per federal property"
              color="orange"
            />
            
            <StatCard
              icon={FiCalendar}
              label="Portfolio Span"
              value={constructionDecadeData.length > 0 ? `${constructionDecadeData.length} Decades` : 'Mixed'}
              helpText="Construction period range"
              color="purple"
            />
          </SimpleGrid>

          {/* Charts Section - Side by side layout with modern styling */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
            
            {/* Construction Timeline Chart */}
            <ChartContainer title="Buildings by Construction Decade" isLoading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={constructionDecadeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [value, 'Buildings']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Space Utilization Chart */}
            <ChartContainer title="Rentable vs. Available Square Footage" isLoading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={spaceUtilizationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {spaceUtilizationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatSquareFootage(Number(value)), 'Square Footage']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SimpleGrid>

          {/* Map Section - Full width hoverable map */}
          <OwnedPropertiesMap buildings={federalOwnedBuildings} isLoading={loading} />

          {/* Portfolio Details - Clean information cards */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
            <Card shadow="sm" border="1px" borderColor="gray.100">
              <CardBody p={6}>
                <VStack align="stretch" spacing={4}>
                  <Heading size="md" color="gray.900">
                    Portfolio Timeline
                  </Heading>
                  
                  <VStack align="stretch" spacing={3}>
                    <Box p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.100">
                      <Text fontSize="sm" color="blue.700" fontWeight="medium" mb={1}>
                        Oldest Federal Building
                      </Text>
                      <Text fontSize="sm" color="blue.900">
                        {federalOwnedStats.oldestBuilding}
                      </Text>
                    </Box>
                    
                    <Box p={4} bg="green.50" borderRadius="lg" border="1px" borderColor="green.100">
                      <Text fontSize="sm" color="green.700" fontWeight="medium" mb={1}>
                        Newest Federal Building
                      </Text>
                      <Text fontSize="sm" color="green.900">
                        {federalOwnedStats.newestBuilding}
                      </Text>
                    </Box>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            <Card shadow="sm" border="1px" borderColor="gray.100">
              <CardBody p={6}>
                <VStack align="stretch" spacing={4}>
                  <Heading size="md" color="gray.900">
                    Portfolio Efficiency
                  </Heading>
                  
                  <VStack align="stretch" spacing={3}>
                    <Box p={4} bg="purple.50" borderRadius="lg" border="1px" borderColor="purple.100">
                      <Text fontSize="sm" color="purple.700" fontWeight="medium" mb={1}>
                        Management Type
                      </Text>
                      <Text fontSize="sm" color="purple.900">
                        Direct Federal Ownership
                      </Text>
                    </Box>
                    
                    <Box p={4} bg="orange.50" borderRadius="lg" border="1px" borderColor="orange.100">
                      <Text fontSize="sm" color="orange.700" fontWeight="medium" mb={1}>
                        Portfolio Status
                      </Text>
                      <Text fontSize="sm" color="orange.900">
                        Active Federal Investment
                      </Text>
                    </Box>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>
      </Container>
    </MainLayout>
  );
} 