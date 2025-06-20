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
import { getAllPropertiesForTable } from '@/lib/services/property-service';
import { filterPropertiesBySearch, formatNumber } from '@/lib/utils/data-helpers';
import { testFirebaseConnection } from '@/lib/test-firebase';
import { TPropertyForTable } from '@/types/property';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function AllPropertiesPage() {
  const [properties, setProperties] = useState<TPropertyForTable[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<TPropertyForTable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<'all' | 'owned' | 'leased'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [zipCodeFilter, setZipCodeFilter] = useState<string>('all');
  const [constructionDateFilter, setConstructionDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<keyof TPropertyForTable>('realPropertyAssetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

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
      console.log('🔄 Loading properties...');
      
      // Test Firebase connection first
      setLoadingProgress(10);
      setLoadingMessage('Testing database connection...');
      const testResult = await testFirebaseConnection();
      if (!testResult.success) {
        throw new Error(`Firebase connection failed: ${testResult.error}`);
      }
      
      // Load data with progress tracking
      const data = await getAllPropertiesForTable(handleProgressUpdate);
      console.log('✅ Properties loaded:', data.length, 'records');
      console.log('📋 Sample data:', data.slice(0, 2));
      
      setProperties(data);
      setFilteredProperties(data);
      
      if (data.length === 0) {
        setError('No properties found. Please check your Firebase configuration and data import.');
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
      filtered = filtered.filter(prop => prop.zipCode === zipCodeFilter);
    }

    // Apply construction date filter (by decade)
    if (constructionDateFilter !== 'all') {
      if (constructionDateFilter === 'unknown') {
        filtered = filtered.filter(prop => !prop.constructionDate);
      } else {
        const decade = parseInt(constructionDateFilter);
        filtered = filtered.filter(prop => {
          if (!prop.constructionDate) return false;
          const year = parseInt(prop.constructionDate.toString());
          return year >= decade && year < decade + 10;
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

  // Generate unique values for dropdown filters
  const uniqueCities = Array.from(new Set(properties.map(p => p.city).filter(Boolean))).sort();
  const uniqueStates = Array.from(new Set(properties.map(p => p.state).filter(Boolean))).sort();
  const uniqueZipCodes = Array.from(new Set(properties.map(p => p.zipCode).filter(Boolean))).sort();
  const uniqueConstructionDecades = Array.from(new Set(
    properties
      .map(p => p.constructionDate ? Math.floor(parseInt(p.constructionDate.toString()) / 10) * 10 : null)
      .filter(decade => decade !== null)
  )).sort((a, b) => (b as number) - (a as number)); // Sort newest first

  const handleSort = (field: keyof TPropertyForTable) => {
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

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  if (loading) {
    return (
      <MainLayout title="All Properties">
        <LoadingProgress
          progress={loadingProgress}
          message={loadingMessage}
          title="Loading Government Properties"
          subtitle="Fetching property data from database..."
        />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="All Properties">
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Error Loading Properties</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
        <Box mt={4}>
          <Button onClick={loadProperties} colorScheme="blue">
            Retry Loading
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="All Properties">
      <Box pr={6}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" mb={2}>
              Government Properties
            </Text>
            <Text fontSize="xs" color="gray.600">
              {formatNumber(filteredProperties.length)} properties found
              {searchTerm && ` (filtered from ${formatNumber(properties.length)} total)`}
            </Text>
          </Box>
          <Button
            leftIcon={<DownloadIcon />}
            onClick={exportToCSV}
            colorScheme="blue"
            size="sm"
            isDisabled={filteredProperties.length === 0}
          >
            Export CSV
          </Button>
        </Flex>

        <Flex mb={6} gap={4} flexWrap="nowrap" w="full">
          <InputGroup flex="3" size="sm">
            <InputLeftElement>
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by property name, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fontSize="sm"
            />
          </InputGroup>
          
          <Select 
            flex="1"
            size="sm"
            fontSize="sm"
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value as 'all' | 'owned' | 'leased')}
          >
            <option value="all">All Types</option>
            <option value="owned">Owned Only</option>
            <option value="leased">Leased Only</option>
          </Select>

          <Select 
            flex="1"
            size="sm"
            fontSize="sm"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by City"
          >
            <option value="all">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </Select>

          <Select 
            flex="1"
            size="sm"
            fontSize="sm"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="Filter by State"
          >
            <option value="all">All States</option>
            {uniqueStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </Select>

          <Select 
            flex="1"
            size="sm"
            fontSize="sm"
            value={zipCodeFilter}
            onChange={(e) => setZipCodeFilter(e.target.value)}
            placeholder="Filter by Zip"
          >
            <option value="all">All Zip Codes</option>
            {uniqueZipCodes.slice(0, 100).map(zip => (
              <option key={zip} value={zip}>{zip}</option>
            ))}
          </Select>

          <Select 
            flex="1"
            size="sm"
            fontSize="sm"
            value={constructionDateFilter}
            onChange={(e) => setConstructionDateFilter(e.target.value)}
            placeholder="Filter by Decade"
          >
            <option value="all">All Decades</option>
            <option value="unknown">Unknown Date</option>
            {uniqueConstructionDecades.map(decade => (
              <option key={decade} value={decade?.toString()}>
                {decade}s ({decade}-{(decade as number) + 9})
              </option>
            ))}
          </Select>

          {/* Clear Filters Button */}
          {(searchTerm || propertyTypeFilter !== 'all' || cityFilter !== 'all' || 
            stateFilter !== 'all' || zipCodeFilter !== 'all' || constructionDateFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              fontSize="sm"
              flexShrink={0}
              onClick={() => {
                setSearchTerm('');
                setPropertyTypeFilter('all');
                setCityFilter('all');
                setStateFilter('all');
                setZipCodeFilter('all');
                setConstructionDateFilter('all');
              }}
            >
              Clear All
            </Button>
          )}
        </Flex>

        {filteredProperties.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg" color="gray.500">
              {searchTerm ? 'No properties match your search criteria.' : 'No properties available.'}
            </Text>
            {searchTerm && (
              <Button mt={4} onClick={() => setSearchTerm('')} variant="outline">
                Clear Search
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Box 
              overflowX="auto" 
              bg="white" 
              borderRadius="xl" 
              border="1px" 
              borderColor="gray.200"
              shadow="sm"
            >
              <Table variant="simple" size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th 
                      minW="200px" 
                      cursor="pointer" 
                      onClick={() => handleSort('realPropertyAssetName')}
                      borderTopLeftRadius="xl"
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      Real Property Asset Name {sortField === 'realPropertyAssetName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="180px" 
                      cursor="pointer" 
                      onClick={() => handleSort('streetAddress')}
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      Street Address {sortField === 'streetAddress' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="100px" 
                      cursor="pointer" 
                      onClick={() => handleSort('city')}
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      City {sortField === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="60px" 
                      cursor="pointer" 
                      onClick={() => handleSort('state')}
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      State {sortField === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="80px"
                      cursor="pointer" 
                      onClick={() => handleSort('zipCode')}
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      Zip Code {sortField === 'zipCode' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="120px" 
                      cursor="pointer" 
                      onClick={() => handleSort('constructionDate')}
                      _hover={{ bg: 'gray.100' }}
                      transition="background-color 0.2s"
                    >
                      Construction Date {sortField === 'constructionDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th 
                      minW="120px"
                      borderTopRightRadius="xl"
                    >
                      Owned or Leased
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {currentProperties.map((property, index) => (
                    <Tr 
                      key={`property-${index}`} 
                      _hover={{ bg: 'blue.50' }}
                      transition="background-color 0.2s"
                    >
                      <Td fontWeight="medium" py={4}>{property.realPropertyAssetName}</Td>
                      <Td py={4}>{property.streetAddress}</Td>
                      <Td py={4}>{property.city}</Td>
                      <Td py={4}>{property.state}</Td>
                      <Td py={4}>{property.zipCode}</Td>
                      <Td py={4}>{property.constructionDate || 'N/A'}</Td>
                      <Td py={4}>
                        <Badge 
                          colorScheme={property.ownedOrLeased === 'F' ? 'green' : 'blue'}
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {property.ownedOrLeased === 'F' ? 'Owned' : 'Leased'}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            {/* Clean Pagination Panel */}
            <Box 
              mt={6} 
              p={4} 
              bg="white" 
              borderRadius="xl" 
              border="1px" 
              borderColor="gray.200"
              shadow="sm"
            >
              <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
                {/* Results Info */}
                <Box>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {formatNumber(filteredProperties.length)} properties
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </Box>

                {/* Pagination Controls */}
                <HStack spacing={2}>
                  {/* First Page */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    borderRadius="lg"
                  >
                    ««
                  </Button>

                  {/* Previous Page */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    borderRadius="lg"
                  >
                    ‹ Previous
                  </Button>

                  {/* Page Numbers */}
                  <HStack spacing={1}>
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      // Adjust start if we're near the end
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      // Add ellipsis at start if needed
                      if (startPage > 1) {
                        pages.push(
                          <Button
                            key={1}
                            size="sm"
                            variant={1 === currentPage ? "solid" : "ghost"}
                            colorScheme={1 === currentPage ? "blue" : "gray"}
                            onClick={() => setCurrentPage(1)}
                            borderRadius="lg"
                            minW="40px"
                          >
                            1
                          </Button>
                        );
                        if (startPage > 2) {
                          pages.push(<Text key="ellipsis1" fontSize="sm" color="gray.400">...</Text>);
                        }
                      }

                      // Add visible page numbers
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            size="sm"
                            variant={i === currentPage ? "solid" : "ghost"}
                            colorScheme={i === currentPage ? "blue" : "gray"}
                            onClick={() => setCurrentPage(i)}
                            borderRadius="lg"
                            minW="40px"
                          >
                            {i}
                          </Button>
                        );
                      }

                      // Add ellipsis at end if needed
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<Text key="ellipsis2" fontSize="sm" color="gray.400">...</Text>);
                        }
                        pages.push(
                          <Button
                            key={totalPages}
                            size="sm"
                            variant={totalPages === currentPage ? "solid" : "ghost"}
                            colorScheme={totalPages === currentPage ? "blue" : "gray"}
                            onClick={() => setCurrentPage(totalPages)}
                            borderRadius="lg"
                            minW="40px"
                          >
                            {totalPages}
                          </Button>
                        );
                      }

                      return pages;
                    })()}
                  </HStack>

                  {/* Next Page */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    borderRadius="lg"
                  >
                    Next ›
                  </Button>

                  {/* Last Page */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    borderRadius="lg"
                  >
                    »»
                  </Button>
                </HStack>

                {/* Items per page selector */}
                <HStack spacing={2} alignItems="center">
                  <Text fontSize="sm" color="gray.600">
                    Show:
                  </Text>
                  <Select 
                    size="sm" 
                    value={itemsPerPage} 
                    w="80px"
                    borderRadius="lg"
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="gray.600">
                    per page
                  </Text>
                </HStack>
              </Flex>
            </Box>
          </>
        )}
      </Box>
    </MainLayout>
  );
} 