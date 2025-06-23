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
  Progress,
  Input,
  InputGroup,
  InputLeftElement
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
import { DownloadIcon, SearchIcon } from '@chakra-ui/icons';
import MainLayout from '../components/layout/main-layout';
import VisTimelineGantt from '../components/VisTimelineGantt';
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

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

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
            {value}
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

// Custom sortable header component
const SortableHeader = ({ 
  field, 
  label, 
  sortField, 
  sortDirection, 
  onSort 
}: {
  field: keyof TBuilding;
  label: string;
  sortField: keyof TBuilding;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof TBuilding) => void;
}) => {
  const isActive = sortField === field;
  
  return (
    <Th 
      fontWeight="semibold" 
      color="gray.700"
      cursor="pointer"
      onClick={() => onSort(field)}
      _hover={{ bg: 'gray.100' }}
      position="relative"
    >
      <Flex align="center" justify="space-between">
        <Text>{label}</Text>
        <Box ml={2} opacity={isActive ? 1 : 0.3}>
          {isActive && sortDirection === 'asc' && <Text fontSize="xs">▲</Text>}
          {isActive && sortDirection === 'desc' && <Text fontSize="xs">▼</Text>}
          {!isActive && <Text fontSize="xs">⇅</Text>}
        </Box>
      </Flex>
    </Th>
  );
};

export default function LeasedPropertiesDashboard() {
  const [leasedBuildings, setLeasedBuildings] = useState<TBuilding[]>([]);
  const [leaseRecords, setLeaseRecords] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<TBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [leaseStats, setLeaseStats] = useState<any>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  
  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState<string>('all');
  const [constructionDateFilter, setConstructionDateFilter] = useState<string>('all');
  const [constructionYearFilter, setConstructionYearFilter] = useState<string>('all');
  const [leaseStartDateFilter, setLeaseStartDateFilter] = useState<string>('all');
  const [leaseEndDateFilter, setLeaseEndDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<keyof TBuilding>('realPropertyAssetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [uniqueFilterValues, setUniqueFilterValues] = useState<{
    cities: string[];
    states: string[];
    leaseStatuses: string[];
    constructionDecades: string[];
    constructionYears: string[];
    leaseStartYears: string[];
    leaseEndYears: string[];
  }>({ cities: [], states: [], leaseStatuses: [], constructionDecades: [], constructionYears: [], leaseStartYears: [], leaseEndYears: [] });
  
  // Modal state for lease data coverage details
  const { isOpen: isCoverageModalOpen, onOpen: onCoverageModalOpen, onClose: onCoverageModalClose } = useDisclosure();

  // Filter processing functions
  const extractUniqueFilterValues = (records: any[]) => {
    const cities = Array.from(new Set(records.map(r => r.city).filter(Boolean))).sort();
    const states = Array.from(new Set(records.map(r => r.state).filter(Boolean))).sort();
    const leaseStatuses = Array.from(new Set(records.map(r => r.leaseStatus).filter(Boolean))).sort();
    
    // For lease records, we don't have construction dates, so we'll return empty arrays
    const constructionDecades: string[] = [];
    const constructionYears: string[] = [];

    // Lease start years (convert to strings)
    const leaseStartYears: string[] = Array.from(new Set(
      records
        .map(r => {
          if (r.leaseEffectiveDate) {
            return new Date(r.leaseEffectiveDate).getFullYear().toString();
          }
          return null;
        })
        .filter((year): year is string => year !== null)
    )).sort((a, b) => parseInt(b) - parseInt(a));

    // Lease end years (convert to strings)
    const leaseEndYears: string[] = Array.from(new Set(
      records
        .map(r => {
          if (r.leaseExpirationDate) {
            return new Date(r.leaseExpirationDate).getFullYear().toString();
          }
          return null;
        })
        .filter((year): year is string => year !== null)
    )).sort((a, b) => parseInt(b) - parseInt(a));

    return {
      cities,
      states,
      leaseStatuses,
      constructionDecades,
      constructionYears,
      leaseStartYears,
      leaseEndYears
    };
  };

  const filterPropertiesBySearch = (properties: TBuilding[], searchTerm: string) => {
    if (!searchTerm.trim()) return properties;
    
    const term = searchTerm.toLowerCase();
    return properties.filter(property =>
      property.realPropertyAssetName?.toLowerCase().includes(term) ||
      property.city?.toLowerCase().includes(term) ||
      property.state?.toLowerCase().includes(term) ||
      property.locationCode?.toLowerCase().includes(term) ||
      (property as any).leaseNumber?.toLowerCase().includes(term)
    );
  };

  const applyFilters = useCallback(() => {
    let filtered = [...(leaseRecords.length > 0 ? leaseRecords : leasedBuildings)];
    
    console.log('🔍 applyFilters debug:', {
      leaseRecordsLength: leaseRecords.length,
      leasedBuildingsLength: leasedBuildings.length,
      usingLeaseRecords: leaseRecords.length > 0,
      filteredLength: filtered.length,
      firstRecord: filtered[0] ? {
        locationCode: filtered[0].locationCode,
        leaseNumber: (filtered[0] as any).leaseNumber,
        hasConstructionDate: !!(filtered[0] as any).constructionDate
      } : null
    });

    // Apply search filter
    filtered = filterPropertiesBySearch(filtered, searchTerm);

    // Apply dropdown filters
    if (cityFilter !== 'all') {
      filtered = filtered.filter(p => p.city === cityFilter);
    }
    if (stateFilter !== 'all') {
      filtered = filtered.filter(p => p.state === stateFilter);
    }
    if (leaseStatusFilter !== 'all') {
      filtered = filtered.filter(p => (p as any).leaseStatus === leaseStatusFilter);
    }
    
    // Construction date filters only work with building data, not lease records
    if (leaseRecords.length === 0) {
      if (constructionDateFilter !== 'all' && constructionDateFilter !== 'unknown') {
        const decade = parseInt(constructionDateFilter);
        filtered = filtered.filter(p => 
          p.constructionDate && p.constructionDate >= decade && p.constructionDate < decade + 10
        );
      } else if (constructionDateFilter === 'unknown') {
        filtered = filtered.filter(p => !p.constructionDate || p.constructionDate <= 0);
      }

      // New construction year filter
      if (constructionYearFilter !== 'all' && constructionYearFilter !== 'unknown') {
        const year = parseInt(constructionYearFilter);
        filtered = filtered.filter(p => p.constructionDate === year);
      } else if (constructionYearFilter === 'unknown') {
        filtered = filtered.filter(p => !p.constructionDate || p.constructionDate <= 0);
      }
    }

    // New lease start date filter
    if (leaseStartDateFilter !== 'all') {
      const year = parseInt(leaseStartDateFilter);
      filtered = filtered.filter(p => {
        const enhanced = p as any;
        if (enhanced.leaseEffectiveDate) {
          return new Date(enhanced.leaseEffectiveDate).getFullYear() === year;
        }
        return false;
      });
    }

    // New lease end date filter
    if (leaseEndDateFilter !== 'all') {
      const year = parseInt(leaseEndDateFilter);
      filtered = filtered.filter(p => {
        const enhanced = p as any;
        if (enhanced.leaseExpirationDate) {
          return new Date(enhanced.leaseExpirationDate).getFullYear() === year;
        }
        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredProperties(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [leasedBuildings, leaseRecords, searchTerm, cityFilter, stateFilter, leaseStatusFilter, constructionDateFilter, constructionYearFilter, leaseStartDateFilter, leaseEndDateFilter, sortField, sortDirection]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Export function
  const exportToCSV = () => {
    const headers = [
      'Building Name',
      'Location Code', 
      'City',
      'State',
      'Lease Number',
      'Lease Start',
      'Lease End',
      'Lease Status',
      'Square Footage'
    ];

    const csvData = filteredProperties.map(property => {
      const enhanced = property as any;
      return [
        property.realPropertyAssetName || '',
        property.locationCode || '',
        property.city || '',
        property.state || '',
        enhanced.leaseNumber || 'N/A',
        enhanced.leaseEffectiveDate ? new Date(enhanced.leaseEffectiveDate).toLocaleDateString() : 'N/A',
        enhanced.leaseExpirationDate ? new Date(enhanced.leaseExpirationDate).toLocaleDateString() : 'N/A',
        enhanced.leaseStatus || 'N/A',
        property.buildingRentableSquareFeet || 0
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leased-properties-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const loadLeasedProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(10);
      setLoadingMessage('Loading enhanced lease data...');

      setLoadingProgress(30);
      setLoadingMessage('Fetching leased buildings with lease data...');

      // Load enhanced buildings for Gantt chart
      const enhancedResponse = await fetch('/api/leases?includeStats=true&format=enhanced');
      if (!enhancedResponse.ok) {
        throw new Error('Failed to fetch enhanced buildings');
      }
      const enhancedData = await enhancedResponse.json();

      setLoadingProgress(50);
      setLoadingMessage('Loading lease records for table...');

      // Load raw lease records for table
      const rawResponse = await fetch('/api/leases?includeStats=true&format=raw');
      if (!rawResponse.ok) {
        throw new Error('Failed to fetch lease records');
      }
      const rawData = await rawResponse.json();

      console.log(`📊 Enhanced Lease Data Analysis:`);
      console.log(`  Total enhanced buildings: ${enhancedData.total}`);
      console.log(`  Total lease records: ${rawData.total}`);
      console.log(`  Buildings with lease data: ${enhancedData.withLeaseData}`);
      console.log(`  Lease Statistics:`, enhancedData.stats);

      setLoadingProgress(80);
      setLoadingMessage('Processing dashboard data...');

      // Set enhanced buildings for Gantt chart
      setLeasedBuildings(enhancedData.buildings || []);
      
      // Set raw lease records for table
      setLeaseRecords(rawData.buildings || []);
      
      // Use raw stats (contains totalLeases property needed for UI)
      setLeaseStats(rawData.stats || {});

      // Extract unique filter values from lease records
      const filterValues = extractUniqueFilterValues(rawData.buildings || []);
      setUniqueFilterValues(filterValues);

      setLoadingProgress(100);
      setLoadingMessage('Dashboard loaded successfully!');

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('❌ Error loading lease data:', error);
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

  // Extract unique filter values when leasedBuildings changes
  useEffect(() => {
    if (leasedBuildings.length > 0) {
      const filterValues = extractUniqueFilterValues(leasedBuildings);
      setUniqueFilterValues(filterValues);
    }
  }, [leasedBuildings]);

  // Calculate lease statistics
  const totalProperties = filteredProperties.length;
  const totalSquareFootage = filteredProperties.reduce(
    (sum, prop) => sum + (prop.buildingRentableSquareFeet || 0),
    0
  );
  const averageSquareFootage = totalProperties > 0 ? totalSquareFootage / totalProperties : 0;

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  // Handle sorting
  const handleSort = (field: keyof TBuilding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
                  {formatNumber(leaseStats.totalBuildings)} Properties
                </Badge>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Key Metrics - Modern stat cards with icons */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StatCard
              icon={FiHome}
              label="Lease Records"
              value={formatNumber(totalProperties)}
              helpText={leaseStats ? `Lease records on ${leaseStats.totalBuildings} properties` : "Total leased buildings"}
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

          {/* Leased Properties Table */}
          <Card shadow="sm" border="1px" borderColor="gray.100">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                {/* Header with Export Button */}
                <Flex justify="space-between" align="center">
                  <Box>
                    <Heading size="md" color="gray.900">
                      Leased Properties Overview
                    </Heading>
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      {filteredProperties.length.toLocaleString()} properties found
                    </Text>
                  </Box>
                  <Button
                    leftIcon={<DownloadIcon />}
                    colorScheme="blue"
                    variant="outline"
                    onClick={exportToCSV}
                    size="sm"
                  >
                    Export CSV
                  </Button>
                </Flex>

                {/* Filters */}
                <VStack spacing={4}>
                  {/* First row of filters */}
                  <Flex gap={4} flexWrap="nowrap" align="center" w="100%">
                    <InputGroup flex="3" size="sm">
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search properties..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg="white"
                        borderColor="gray.300"
                        fontSize="sm"
                      />
                    </InputGroup>

                    <Select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Cities</option>
                      {uniqueFilterValues.cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </Select>

                    <Select
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All States</option>
                      {uniqueFilterValues.states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </Select>

                    <Select
                      value={leaseStatusFilter}
                      onChange={(e) => setLeaseStatusFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Statuses</option>
                      {uniqueFilterValues.leaseStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </Select>
                  </Flex>

                  {/* Second row of filters */}
                  <Flex gap={4} flexWrap="nowrap" align="center" w="100%">
                    <Select
                      value={constructionDateFilter}
                      onChange={(e) => setConstructionDateFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Decades</option>
                      <option value="unknown">Unknown</option>
                      {uniqueFilterValues.constructionDecades.map(decade => (
                        <option key={decade} value={decade}>{decade}s</option>
                      ))}
                    </Select>

                    <Select
                      value={constructionYearFilter}
                      onChange={(e) => setConstructionYearFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Construction Years</option>
                      <option value="unknown">Unknown</option>
                      {uniqueFilterValues.constructionYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Select>

                    <Select
                      value={leaseStartDateFilter}
                      onChange={(e) => setLeaseStartDateFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Lease Start Years</option>
                      {uniqueFilterValues.leaseStartYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Select>

                    <Select
                      value={leaseEndDateFilter}
                      onChange={(e) => setLeaseEndDateFilter(e.target.value)}
                      flex="1"
                      size="sm"
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    >
                      <option value="all">All Lease End Years</option>
                      {uniqueFilterValues.leaseEndYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Select>

                    {/* Clear Filters Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="gray"
                      onClick={() => {
                        setSearchTerm('');
                        setCityFilter('all');
                        setStateFilter('all');
                        setLeaseStatusFilter('all');
                        setConstructionDateFilter('all');
                        setConstructionYearFilter('all');
                        setLeaseStartDateFilter('all');
                        setLeaseEndDateFilter('all');
                      }}
                    >
                      Clear All
                    </Button>
                  </Flex>
                </VStack>

                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th 
                          fontWeight="semibold" 
                          color="gray.700"
                          cursor="pointer"
                          onClick={() => handleSort('realPropertyAssetName')}
                          _hover={{ bg: 'gray.100' }}
                        >
                          <Flex align="center" justify="space-between">
                            Building Name
                            <Box ml={2} fontSize="xs" opacity={sortField === 'realPropertyAssetName' ? 1 : 0.3}>
                              {sortField === 'realPropertyAssetName' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                            </Box>
                          </Flex>
                        </Th>
                        <Th 
                          fontWeight="semibold" 
                          color="gray.700"
                          cursor="pointer"
                          onClick={() => handleSort('city')}
                          _hover={{ bg: 'gray.100' }}
                        >
                          <Flex align="center" justify="space-between">
                            City
                            <Box ml={2} fontSize="xs" opacity={sortField === 'city' ? 1 : 0.3}>
                              {sortField === 'city' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                            </Box>
                          </Flex>
                        </Th>
                        <Th 
                          fontWeight="semibold" 
                          color="gray.700"
                          cursor="pointer"
                          onClick={() => handleSort('state')}
                          _hover={{ bg: 'gray.100' }}
                        >
                          <Flex align="center" justify="space-between">
                            State
                            <Box ml={2} fontSize="xs" opacity={sortField === 'state' ? 1 : 0.3}>
                              {sortField === 'state' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                            </Box>
                          </Flex>
                        </Th>

                        <Th fontWeight="semibold" color="gray.700">Lease Number</Th>
                        <Th fontWeight="semibold" color="gray.700">Lease Start</Th>
                        <Th fontWeight="semibold" color="gray.700">Lease End</Th>
                        <Th fontWeight="semibold" color="gray.700">Status</Th>
                        <Th 
                          fontWeight="semibold" 
                          color="gray.700"
                          cursor="pointer"
                          onClick={() => handleSort('buildingRentableSquareFeet')}
                          _hover={{ bg: 'gray.100' }}
                        >
                          <Flex align="center" justify="space-between">
                            Square Footage
                            <Box ml={2} fontSize="xs" opacity={sortField === 'buildingRentableSquareFeet' ? 1 : 0.3}>
                              {sortField === 'buildingRentableSquareFeet' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                            </Box>
                          </Flex>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedProperties.map((property, index) => {
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
                              {(property as any).leaseNumber || 'N/A'}
                            </Td>
                            <Td>
                              {(property as any).leaseEffectiveDate 
                                ? new Date((property as any).leaseEffectiveDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </Td>
                            <Td>
                              {(property as any).leaseExpirationDate 
                                ? new Date((property as any).leaseExpirationDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </Td>
                            <Td>
                              {(property as any).leaseStatus ? (
                                <Badge 
                                  colorScheme={
                                    (property as any).leaseStatus === 'active' ? 'green' : 
                                    (property as any).leaseStatus === 'expired' ? 'red' : 'yellow'
                                  } 
                                  variant="subtle" 
                                  fontSize="xs"
                                >
                                  {(property as any).leaseStatus}
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

                {/* Pagination */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={4}>
                    <Text fontSize="sm" color="gray.600">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length.toLocaleString()} results
                    </Text>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.600">Items per page:</Text>
                      <Select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        size="sm"
                        w="20"
                        bg="white"
                        borderColor="gray.300"
                      >
                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </Select>
                    </HStack>
                  </HStack>

                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      isDisabled={currentPage === 1}
                      variant="outline"
                    >
                      Previous
                    </Button>
                    
                    <Text fontSize="sm" color="gray.600">
                      Page {currentPage} of {totalPages}
                    </Text>
                    
                    <Button
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      isDisabled={currentPage === totalPages}
                      variant="outline"
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>

                {filteredProperties.length === 0 && (
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

        </VStack>
      </Container>
    </MainLayout>
  );
} 