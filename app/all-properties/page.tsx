'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Flex,
  Text,
  Select,
  HStack,
  Badge,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  VStack,
} from '@chakra-ui/react';
import { DownloadIcon, SearchIcon } from '@chakra-ui/icons';
import MainLayout from '@/app/components/layout/main-layout';
import LoadingProgress from '@/app/components/ui/loading-progress';
import { getAllBuildings, getUniqueFilterValues, getDataSourceInfo } from '@/lib/services/unified-data-service';
import { filterPropertiesBySearch, formatNumber } from '@/lib/utils/data-helpers';
import { TBuilding } from '@/types/property';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function AllPropertiesPage() {
  const [properties, setProperties] = useState<TBuilding[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<TBuilding[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<'all' | 'owned' | 'leased'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [zipCodeFilter, setZipCodeFilter] = useState<string>('all');
  const [constructionDateFilter, setConstructionDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<keyof TBuilding>('realPropertyAssetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [uniqueFilterValues, setUniqueFilterValues] = useState<{
    cities: string[];
    states: string[];
    zipCodes: string[];
    constructionDecades: string[];
  }>({ cities: [], states: [], zipCodes: [], constructionDecades: [] });

  const handleProgressUpdate = (progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingMessage('Initializing...');
      
      const dataSourceInfo = getDataSourceInfo();
      console.log(`🔄 Loading properties from ${dataSourceInfo.source}...`);
      
      setLoadingProgress(20);
      setLoadingMessage(`Loading from ${dataSourceInfo.description}...`);
      
      // Get all data without pagination for client-side filtering
      const result = await getAllBuildings(1, 999999); // Get all records
      const data = result.buildings;
      
      setLoadingProgress(60);
      setLoadingMessage('Loading filter options...');
      
      // Get unique filter values
      const filterValues = await getUniqueFilterValues();
      setUniqueFilterValues(filterValues);
      
      setLoadingProgress(90);
      setLoadingMessage('Finalizing...');
      
      console.log('✅ Properties loaded:', data.length, 'records');
      console.log('📋 Sample data:', data.slice(0, 2));
      
      setProperties(data);
      setFilteredProperties(data);
      
      setLoadingProgress(100);
      setLoadingMessage('Complete!');
      
      if (data.length === 0) {
        setError('No properties found. Please check your data source configuration.');
      }
    } catch (error) {
      console.error('❌ Error loading properties:', error);
      setError(`Failed to load properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoadingProgress(0);
      setLoadingMessage('Error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let filtered = filterPropertiesBySearch(properties, searchTerm);
    
    // Apply property type filter
    if (propertyTypeFilter === 'owned') {
      filtered = filtered.filter(prop => prop.ownedOrLeased === 'F');
    } else if (propertyTypeFilter === 'leased') {
      filtered = filtered.filter(prop => prop.ownedOrLeased === 'L');
    }

    // Apply city filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(prop => prop.city === cityFilter);
    }

    // Apply state filter
    if (stateFilter !== 'all') {
      filtered = filtered.filter(prop => prop.state === stateFilter);
    }

    // Apply zip code filter
    if (zipCodeFilter !== 'all') {
      filtered = filtered.filter(prop => prop.zipCode.toString() === zipCodeFilter);
    }

    // Apply construction date filter (by decade)
    if (constructionDateFilter !== 'all') {
      if (constructionDateFilter === 'unknown') {
        filtered = filtered.filter(prop => !prop.constructionDate || prop.constructionDate === 0);
      } else {
        const decade = parseInt(constructionDateFilter);
        filtered = filtered.filter(prop => {
          if (!prop.constructionDate || prop.constructionDate === 0) return false;
          return prop.constructionDate >= decade && prop.constructionDate < decade + 10;
        });
      }
    }
    
    setFilteredProperties(filtered);
    setCurrentPage(1);
  }, [properties, searchTerm, propertyTypeFilter, cityFilter, stateFilter, zipCodeFilter, constructionDateFilter]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleSort = (field: keyof TBuilding) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);

    const sorted = [...filteredProperties].sort((a, b) => {
      const aValue = a[field] || '';
      const bValue = b[field] || '';
      
      if (direction === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    setFilteredProperties(sorted);
  };

  const exportToCSV = () => {
    const headers = ['Property Name', 'Address', 'City', 'State', 'Zip Code', 'Construction Date', 'Type'];
    const csvContent = [
      headers.join(','),
      ...filteredProperties.map(prop => [
        `"${prop.realPropertyAssetName}"`,
        `"${prop.streetAddress}"`,
        `"${prop.city}"`,
        `"${prop.state}"`,
        `"${prop.zipCode}"`,
        `"${prop.constructionDate || 'N/A'}"`,
        `"${prop.ownedOrLeased === 'F' ? 'Owned' : 'Leased'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'government-properties.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setPropertyTypeFilter('all');
    setCityFilter('all');
    setStateFilter('all');
    setZipCodeFilter('all');
    setConstructionDateFilter('all');
  };

  const hasActiveFilters = searchTerm || propertyTypeFilter !== 'all' || cityFilter !== 'all' || 
    stateFilter !== 'all' || zipCodeFilter !== 'all' || constructionDateFilter !== 'all';

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  if (loading) {
    return (
      <MainLayout>
        <LoadingProgress
          progress={loadingProgress}
          title="Loading Properties"
          subtitle={loadingMessage}
          showSpinner={true}
        />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Center h="400px">
          <Alert status="error" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error Loading Properties</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        </Center>
      </MainLayout>
    );
  }

  const dataSourceInfo = getDataSourceInfo();

  return (
    <MainLayout>
      <Box p={6} pr={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              All Properties
            </Text>
            <Text fontSize="xs" color="gray.600" mt={1}>
              {filteredProperties.length.toLocaleString()} properties found • Data source: {dataSourceInfo.description}
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
        <Flex gap={4} mb={6} flexWrap="nowrap" align="center">
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
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value as 'all' | 'owned' | 'leased')}
            flex="1"
            size="sm"
            fontSize="sm"
            bg="white"
            borderColor="gray.300"
          >
            <option value="all">All Types</option>
            <option value="owned">Federal Owned</option>
            <option value="leased">Leased</option>
          </Select>

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
            value={zipCodeFilter}
            onChange={(e) => setZipCodeFilter(e.target.value)}
            flex="1"
            size="sm"
            fontSize="sm"
            bg="white"
            borderColor="gray.300"
          >
            <option value="all">All Zip Codes</option>
            {uniqueFilterValues.zipCodes.map(zip => (
              <option key={zip} value={zip}>{zip}</option>
            ))}
          </Select>

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

          {hasActiveFilters && (
            <Button
              onClick={clearAllFilters}
              size="sm"
              variant="ghost"
              colorScheme="red"
              fontSize="sm"
            >
              Clear All
            </Button>
          )}
        </Flex>

        {/* Table */}
        <TableContainer
          bg="white"
          borderRadius="xl"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
          mb={6}
        >
          <Table variant="simple" layout="fixed">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <Thead>
              <Tr>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('realPropertyAssetName')}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                  py={4}
                >
                  <Flex align="center" justify="space-between">
                    Property Name
                    {sortField === 'realPropertyAssetName' && (
                      <Text fontSize="xs" color="blue.500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Flex>
                </Th>
                <Th py={4}>Address</Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('city')}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                  py={4}
                >
                  <Flex align="center" justify="space-between">
                    City
                    {sortField === 'city' && (
                      <Text fontSize="xs" color="blue.500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Flex>
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('state')}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                  py={4}
                >
                  <Flex align="center" justify="space-between">
                    State
                    {sortField === 'state' && (
                      <Text fontSize="xs" color="blue.500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Flex>
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('zipCode')}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                  py={4}
                >
                  <Flex align="center" justify="space-between">
                    Zip Code
                    {sortField === 'zipCode' && (
                      <Text fontSize="xs" color="blue.500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Flex>
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('constructionDate')}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                  py={4}
                >
                  <Flex align="center" justify="space-between">
                    Built
                    {sortField === 'constructionDate' && (
                      <Text fontSize="xs" color="blue.500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Flex>
                </Th>
                <Th py={4}>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {currentProperties.map((property, index) => (
                <Tr
                  key={`${property.locationCode}-${index}`}
                  _hover={{ bg: 'gray.50' }}
                  transition="background-color 0.2s"
                >
                  <Td py={4}>
                    <Text fontWeight="medium" fontSize="sm" noOfLines={2}>
                      {property.realPropertyAssetName}
                    </Text>
                    {property.installationName && (
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {property.installationName}
                      </Text>
                    )}
                  </Td>
                  <Td py={4}>
                    <Text fontSize="sm" noOfLines={2}>
                      {property.streetAddress}
                    </Text>
                  </Td>
                  <Td py={4}>
                    <Text fontSize="sm">{property.city}</Text>
                  </Td>
                  <Td py={4}>
                    <Text fontSize="sm" fontWeight="medium">{property.state}</Text>
                  </Td>
                  <Td py={4}>
                    <Text fontSize="sm">{property.zipCode || 'N/A'}</Text>
                  </Td>
                  <Td py={4}>
                    <Text fontSize="sm">{property.constructionDate || 'Unknown'}</Text>
                  </Td>
                  <Td py={4}>
                    <Badge
                      colorScheme={property.ownedOrLeased === 'F' ? 'green' : 'blue'}
                      variant="subtle"
                      borderRadius="full"
                      px={2}
                      py={1}
                      fontSize="xs"
                    >
                      {property.ownedOrLeased === 'F' ? 'Owned' : 'Leased'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Flex justify="space-between" align="center" mt={6}>
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
              onClick={() => setCurrentPage(1)}
              isDisabled={currentPage === 1}
              variant="outline"
            >
              First
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              isDisabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>

            {/* Page numbers */}
            <HStack spacing={1}>
              {(() => {
                const maxVisible = 5;
                const half = Math.floor(maxVisible / 2);
                let start = Math.max(1, currentPage - half);
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }

                const pages = [];
                
                if (start > 1) {
                  pages.push(
                    <Button key={1} size="sm" variant="outline" onClick={() => setCurrentPage(1)}>
                      1
                    </Button>
                  );
                  if (start > 2) {
                    pages.push(<Text key="ellipsis1" fontSize="sm">...</Text>);
                  }
                }

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <Button
                      key={i}
                      size="sm"
                      variant={currentPage === i ? "solid" : "outline"}
                      colorScheme={currentPage === i ? "blue" : "gray"}
                      onClick={() => setCurrentPage(i)}
                    >
                      {i}
                    </Button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pages.push(<Text key="ellipsis2" fontSize="sm">...</Text>);
                  }
                  pages.push(
                    <Button key={totalPages} size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)}>
                      {totalPages}
                    </Button>
                  );
                }

                return pages;
              })()}
            </HStack>

            <Button
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              isDisabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              isDisabled={currentPage === totalPages}
              variant="outline"
            >
              Last
            </Button>
          </HStack>
        </Flex>
      </Box>
    </MainLayout>
  );
} 