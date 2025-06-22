'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Spinner,
  Center,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Select,
  Flex,
  Spacer,
  SimpleGrid,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Progress
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
  Cell
} from 'recharts';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import MainLayout from '../components/layout/main-layout';
import VisTimelineGantt from '../components/VisTimelineGantt';
import DebugInfo from '../components/DebugInfo';
import { TBuilding } from '../../types/property';
import {
  FiHome,
  FiDollarSign,
  FiCalendar,
  FiTrendingUp,
  FiMapPin,
  FiBarChart,
  FiClock
} from 'react-icons/fi';

// Modern color palette following design guidelines
const CHART_COLORS = {
  primary: '#2563eb',
  secondary: '#10b981',
  accent: '#f59e0b',
  warning: '#ef4444',
  gradient: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']
};

// Utility functions
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatSquareFootage = (sqft: number): string => {
  if (sqft >= 1000000) {
    return `${(sqft / 1000000).toFixed(1)}M sq ft`;
  } else if (sqft >= 1000) {
    return `${(sqft / 1000).toFixed(0)}K sq ft`;
  }
  return `${sqft.toLocaleString()} sq ft`;
};

// Loading Progress Component
const LoadingProgress = ({ 
  progress, 
  message, 
  title, 
  subtitle 
}: { 
  progress: number; 
  message: string; 
  title: string; 
  subtitle: string; 
}) => (
  <Container maxW="md" py={20}>
    <VStack spacing={6}>
      <VStack spacing={3}>
        <Heading size="lg" color="gray.900">{title}</Heading>
        <Text color="gray.600">{subtitle}</Text>
      </VStack>
      
      <Box w="100%" bg="gray.200" borderRadius="full" h="2">
        <Box 
          bg="blue.500" 
          h="2" 
          borderRadius="full" 
          w={`${progress}%`} 
          transition="width 0.3s ease"
        />
      </Box>
      
      <VStack spacing={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {message}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {progress}% complete
        </Text>
      </VStack>
    </VStack>
  </Container>
);

// Custom stat card component following modern design principles
const StatCard = ({ 
  label, 
  value, 
  helpText, 
  icon, 
  color = 'blue',
  isLoading = false,
  onClick,
  isClickable = false
}: {
  label: string;
  value: string | number;
  helpText: string;
  icon: any;
  color?: string;
  isLoading?: boolean;
  onClick?: () => void;
  isClickable?: boolean;
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Card 
      bg={bgColor} 
      border="1px" 
      borderColor={borderColor} 
      shadow="sm" 
      _hover={{ 
        shadow: 'md',
        transform: isClickable ? 'translateY(-2px)' : 'none',
        borderColor: isClickable ? `${color}.200` : borderColor
      }} 
      transition="all 0.2s"
      cursor={isClickable ? 'pointer' : 'default'}
      onClick={onClick}
    >
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
          {isClickable && (
            <Icon as={FiTrendingUp} boxSize={4} color="gray.400" />
          )}
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
          {isClickable && (
            <Text fontSize="xs" color={`${color}.500`} fontWeight="medium">
              Click for details →
            </Text>
          )}
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
            <Center h="400px">
              <VStack spacing={4}>
                <Spinner size="lg" color="blue.500" />
                <Text fontSize="sm" color="gray.500">Loading chart data...</Text>
              </VStack>
            </Center>
          ) : (
            <Box h="400px">
              {children}
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default function LeasedPropertiesDashboard() {
  const [leasedBuildings, setLeasedBuildings] = useState<TBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [leaseStats, setLeaseStats] = useState<any>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  
  // Modal state for lease data coverage details
  const { isOpen: isCoverageModalOpen, onOpen: onCoverageModalOpen, onClose: onCoverageModalClose } = useDisclosure();

  const loadLeasedProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(10);
      setLoadingMessage('Loading enhanced lease data...');

      setLoadingProgress(30);
      setLoadingMessage('Fetching leased buildings with real lease data...');

      // Use the enhanced lease data API instead of the regular buildings API
      const response = await fetch('/api/leases?includeStats=true');
      if (!response.ok) {
        throw new Error('Failed to fetch lease data');
      }

      const data = await response.json();
      const enhancedLeasedBuildings = data.buildings || [];
      const leaseStats = data.stats || {};

      console.log(`📊 Enhanced Lease Data Analysis:`);
      console.log(`  Total leased buildings: ${data.total}`);
      console.log(`  Buildings with lease data: ${data.withLeaseData}`);
      console.log(`  Coverage: ${((data.withLeaseData / data.total) * 100).toFixed(1)}%`);
      console.log(`  Lease Statistics:`, leaseStats);

      setLoadingProgress(90);
      setLoadingMessage('Processing enhanced dashboard data...');

      setLeasedBuildings(enhancedLeasedBuildings);
      setLeaseStats(leaseStats);

      console.log('📊 Lease Statistics Debug:', {
        leaseStats,
        leaseDataCoverage: leaseStats?.leaseDataCoverage,
        totalWithLeaseData: leaseStats?.totalWithLeaseData,
        totalBuildings: leaseStats?.totalBuildings,
        calculatedCoverage: leaseStats?.totalBuildings > 0 ? (leaseStats?.totalWithLeaseData / leaseStats?.totalBuildings * 100) : 0
      });

      setLoadingProgress(100);
      setLoadingMessage('Enhanced dashboard loaded successfully!');

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('❌ Error loading enhanced lease data:', error);
      setError(`Failed to load lease data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoadingProgress(0);
      setLoadingMessage('Error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeasedProperties();
  }, [loadLeasedProperties]);

  // Calculate lease statistics
  const totalProperties = leasedBuildings.length;
  const totalSquareFootage = leasedBuildings.reduce(
    (sum, prop) => sum + (prop.buildingRentableSquareFeet || 0),
    0
  );
  const averageSquareFootage = totalProperties > 0 ? totalSquareFootage / totalProperties : 0;

  // Get properties by construction decade for analysis
  const constructionDecades = leasedBuildings
    .filter(prop => prop.constructionDate && prop.constructionDate > 0)
    .reduce((acc, prop) => {
      const decade = Math.floor(prop.constructionDate / 10) * 10;
      const decadeLabel = `${decade}s`;
      acc[decadeLabel] = (acc[decadeLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const constructionData = Object.entries(constructionDecades)
    .map(([decade, count]) => ({ name: decade, value: count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <MainLayout title="Leased Properties Dashboard">
        <LoadingProgress
          progress={loadingProgress}
          message={loadingMessage}
          title="Loading Leased Properties"
          subtitle="Fetching government-leased building data..."
        />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Leased Properties Dashboard">
        <Container maxW="7xl" py={8}>
          <VStack spacing={6}>
            <Alert status="error">
              <AlertIcon />
              <Box>
                <AlertTitle>Error Loading Leased Properties</AlertTitle>
                <AlertDescription>
                  <Text mb={2}>{error}</Text>
                </AlertDescription>
              </Box>
            </Alert>
            <Button onClick={loadLeasedProperties} colorScheme="blue">
              Retry Loading
            </Button>
          </VStack>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Leased Properties Dashboard">
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">

          {/* Header Section - Clean typography hierarchy */}
          <Box>
            <VStack spacing={3} align="stretch">
              <HStack spacing={3} align="center">
                <Icon as={FiCalendar} boxSize={8} color="blue.600" />
                <VStack align="start" spacing={0}>
                  <Heading size="xl" color="gray.900" fontWeight="bold">
                    Leased Properties
                  </Heading>
                  <Text color="gray.600" fontSize="lg">
                    Government-leased building portfolio analytics
                  </Text>
                </VStack>
              </HStack>

              <HStack spacing={3}>
                <Badge colorScheme="blue" px={3} py={1} borderRadius="full" fontSize="sm">
                  Leased Properties Only
                </Badge>
                <Badge colorScheme="orange" px={3} py={1} borderRadius="full" fontSize="sm">
                  {formatNumber(totalProperties)} Buildings
                </Badge>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Key Metrics - Modern stat cards with icons */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StatCard
              icon={FiHome}
              label="Leased Properties"
              value={formatNumber(totalProperties)}
              helpText={leaseStats ? `${leaseStats.totalWithLeaseData} with lease data` : "Total leased buildings"}
              color="blue"
            />

            <StatCard
              icon={FiTrendingUp}
              label="Total Leased Space"
              value={formatSquareFootage(totalSquareFootage)}
              helpText="Rentable space under lease"
              color="green"
            />

            <StatCard
              icon={FiCalendar}
              label="Active Leases"
              value={leaseStats?.activeLeases || 'N/A'}
              helpText={leaseStats ? `Avg ${leaseStats.avgLeaseDuration} years` : "With lease data"}
              color="orange"
            />

            <StatCard
              icon={FiClock}
              label="Lease Data Coverage"
              value={leaseStats ? `${Math.round(leaseStats.leaseDataCoverage || 0)}%` : 'N/A'}
              helpText={leaseStats ? `${leaseStats.totalWithLeaseData} of ${totalProperties} buildings` : "Data availability"}
              color="purple"
            />
          </SimpleGrid>

          {/* Lease Timeline Chart - Full Width */}
          <Card shadow="sm" border="1px" borderColor="gray.100">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md" color="gray.900">
                  Lease Timeline
                </Heading>

                {loading ? (
                  <Center h="500px">
                    <VStack spacing={4}>
                      <Spinner size="lg" color="blue.500" />
                      <Text fontSize="sm" color="gray.500">Loading Gantt chart...</Text>
                    </VStack>
                  </Center>
                ) : (
                  <>
                    {console.log('🏠 Passing buildings to VisTimelineGantt:', {
                      buildingsCount: leasedBuildings.length,
                      firstBuilding: leasedBuildings[0] ? {
                        locationCode: leasedBuildings[0].locationCode,
                        realPropertyAssetName: leasedBuildings[0].realPropertyAssetName,
                        hasLeases: (leasedBuildings[0] as any).leases ? (leasedBuildings[0] as any).leases.length : 'no leases property',
                        hasPrimaryLease: (leasedBuildings[0] as any).primaryLease ? 'yes' : 'no'
                      } : 'no first building'
                    })}
                    <VisTimelineGantt 
                      buildings={leasedBuildings}
                      limit={10}
                      useRealLeaseData={true}
                    />
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Construction Timeline Chart - Full Width */}
          <Card shadow="sm" border="1px" borderColor="gray.100">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md" color="gray.900">
                  Leased Buildings by Construction Era
                </Heading>

                {loading ? (
                  <Center h="400px">
                    <VStack spacing={4}>
                      <Spinner size="lg" color="blue.500" />
                      <Text fontSize="sm" color="gray.500">Loading chart data...</Text>
                    </VStack>
                  </Center>
                ) : (
                  <Box h="400px">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={constructionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                          fill={CHART_COLORS.secondary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Leased Properties Table */}
          <Card shadow="sm" border="1px" borderColor="gray.100">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md" color="gray.900">
                  Leased Properties Overview
                </Heading>

                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th fontWeight="semibold" color="gray.700">Building Name</Th>
                        <Th fontWeight="semibold" color="gray.700">City</Th>
                        <Th fontWeight="semibold" color="gray.700">State</Th>
                        <Th fontWeight="semibold" color="gray.700">Construction Date</Th>
                        <Th fontWeight="semibold" color="gray.700">Lease Number</Th>
                        <Th fontWeight="semibold" color="gray.700">Lease Start</Th>
                        <Th fontWeight="semibold" color="gray.700">Lease End</Th>
                        <Th fontWeight="semibold" color="gray.700">Status</Th>
                        <Th fontWeight="semibold" color="gray.700">Square Footage</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {leasedBuildings.slice(0, 50).map((property, index) => {
                        const enhancedProp = property as any; // EnhancedLeasedBuilding
                        return (
                          <Tr key={index} _hover={{ bg: 'blue.50' }} transition="all 0.2s">
                            <Td fontWeight="medium" maxW="300px">
                              <Text noOfLines={2}>{property.realPropertyAssetName}</Text>
                            </Td>
                            <Td>{property.city}</Td>
                            <Td>
                              <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                                {property.state}
                              </Badge>
                            </Td>
                            <Td>
                              {property.constructionDate && property.constructionDate > 0
                                ? property.constructionDate
                                : 'N/A'
                              }
                            </Td>
                            <Td>
                              {enhancedProp.leaseNumber || 'N/A'}
                            </Td>
                            <Td>
                              {enhancedProp.leaseEffectiveDate 
                                ? new Date(enhancedProp.leaseEffectiveDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </Td>
                            <Td>
                              {enhancedProp.leaseExpirationDate 
                                ? new Date(enhancedProp.leaseExpirationDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </Td>
                            <Td>
                              {enhancedProp.leaseStatus ? (
                                <Badge 
                                  colorScheme={
                                    enhancedProp.leaseStatus === 'active' ? 'green' : 
                                    enhancedProp.leaseStatus === 'expired' ? 'red' : 'yellow'
                                  } 
                                  variant="subtle" 
                                  fontSize="xs"
                                >
                                  {enhancedProp.leaseStatus}
                                </Badge>
                              ) : 'N/A'}
                            </Td>
                            <Td>{formatSquareFootage(property.buildingRentableSquareFeet || 0)}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>

                {leasedBuildings.length > 50 && (
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    Showing first 50 properties. Total: {formatNumber(leasedBuildings.length)} leased properties
                  </Text>
                )}

                {leasedBuildings.length === 0 && (
                  <Center py={8}>
                    <VStack spacing={3}>
                      <Text color="gray.500">No leased properties found</Text>
                      <Button size="sm" onClick={loadLeasedProperties}>
                        Refresh Data
                      </Button>
                    </VStack>
                  </Center>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Note about data limitations */}
          <Card bg="blue.50" border="1px" borderColor="blue.200">
            <CardBody p={4}>
              <HStack spacing={3}>
                <Icon as={FiCalendar} color="blue.600" />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="medium" color="blue.800">
                    Data Note
                  </Text>
                  <Text fontSize="xs" color="blue.700">
                    Lease terms are based on actual lease data.
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>

        </VStack>
      </Container>
    </MainLayout>
  );
} 