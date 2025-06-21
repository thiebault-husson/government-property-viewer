'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Flex,
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
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
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
import { getOwnedPropertiesForDashboard, getAllBuildings } from '@/lib/services/property-service';
import { testFirebaseConnection } from '@/lib/test-firebase';
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

  const handleProgressUpdate = (progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  const loadOwnedProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingMessage('Initializing...');
      console.log('🔄 Loading owned properties...');
      
      // Test Firebase connection first
      setLoadingProgress(10);
      setLoadingMessage('Testing database connection...');
      const testResult = await testFirebaseConnection();
      if (!testResult.success) {
        throw new Error(`Firebase connection failed: ${testResult.error}`);
      }
      
      // First, let's analyze ALL buildings to see what ownership values exist
      setLoadingProgress(20);
      setLoadingMessage('Analyzing building ownership data...');
      const allBuildings = await getAllBuildings();
      
      console.log('📊 Database Analysis:');
      console.log(`Total buildings: ${allBuildings.length}`);
      
      // Analyze ownership values
      const ownershipCounts: { [key: string]: number } = {};
      const sampleBuildings: any[] = [];
      
      allBuildings.forEach((building, index) => {
        const ownership = building.ownedOrLeased;
        ownershipCounts[ownership || 'undefined'] = (ownershipCounts[ownership || 'undefined'] || 0) + 1;
        
        // Collect first 10 buildings as samples
        if (index < 10) {
          sampleBuildings.push({
            name: building.realPropertyAssetName,
            ownership: building.ownedOrLeased,
            city: building.city,
            state: building.state
          });
        }
      });
      
      console.log('🏢 Ownership breakdown:');
      Object.entries(ownershipCounts).forEach(([key, count]) => {
        console.log(`  "${key}": ${count} buildings`);
      });
      
      console.log('📋 Sample buildings (first 10):');
      sampleBuildings.forEach((building, i) => {
        console.log(`  ${i + 1}. ${building.name} - Ownership: "${building.ownership}" - ${building.city}, ${building.state}`);
      });
      
      // Now try to load owned properties with the standard query
      setLoadingProgress(50);
      setLoadingMessage('Querying owned properties...');
      const data = await getOwnedPropertiesForDashboard(handleProgressUpdate);
      console.log('✅ Owned properties query result:', data.length, 'records');
      
      setFederalOwnedBuildings(data);
      
      if (data.length === 0) {
        // Create detailed error message with analysis
        const ownedCount = ownershipCounts['F'] || 0;
        const leasedCount = ownershipCounts['L'] || 0;
        const unknownCount = ownershipCounts['undefined'] || 0;
        const otherValues = Object.entries(ownershipCounts)
          .filter(([key]) => key !== 'F' && key !== 'L' && key !== 'undefined')
          .map(([key, count]) => `"${key}": ${count}`)
          .join(', ');
        
        let errorMsg = `No owned properties found. Database analysis:\n`;
        errorMsg += `• Total buildings: ${allBuildings.length}\n`;
        errorMsg += `• "F" (Federal Owned): ${ownedCount}\n`;
        errorMsg += `• "L" (Leased): ${leasedCount}\n`;
        errorMsg += `• Undefined: ${unknownCount}\n`;
        if (otherValues) {
          errorMsg += `• Other values: ${otherValues}\n`;
        }
        errorMsg += `\nCheck console for detailed sample data.`;
        
        setError(errorMsg);
      }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <MainLayout title="Owned Properties Dashboard">
        <LoadingProgress
          progress={loadingProgress}
          message={loadingMessage}
          title="Loading Federal Owned Properties"
          subtitle="Fetching government-owned building data from database..."
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
                  <Text mb={2}>No owned properties found in the database.</Text>
                  <Box as="pre" fontSize="sm" whiteSpace="pre-wrap" bg="gray.50" p={3} borderRadius="md">
                    {error}
                  </Box>
                </AlertDescription>
              </Box>
            </Alert>
            <Button onClick={loadOwnedProperties} colorScheme="blue">
              Retry Analysis
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
            <ChartContainer title="Space Utilization Breakdown" isLoading={loading}>
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