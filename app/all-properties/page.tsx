'use client';

import { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { DownloadIcon, SearchIcon } from '@chakra-ui/icons';
import MainLayout from '@/app/components/layout/main-layout';
import { getAllPropertiesForTable } from '@/lib/services/property-service';
import { filterPropertiesBySearch, formatNumber } from '@/lib/utils/data-helpers';
import { TPropertyForTable } from '@/types/property';

const ITEMS_PER_PAGE = 25;

export default function AllPropertiesPage() {
  const [properties, setProperties] = useState<TPropertyForTable[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<TPropertyForTable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof TPropertyForTable>('realPropertyAssetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const filtered = filterPropertiesBySearch(properties, searchTerm);
    setFilteredProperties(filtered);
    setCurrentPage(1);
  }, [properties, searchTerm]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getAllPropertiesForTable();
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  if (loading) {
    return (
      <MainLayout title="All Properties">
        <Center h="400px">
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="All Properties">
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Text fontSize="lg" color="gray.600">
            {formatNumber(filteredProperties.length)} properties found
          </Text>
          <Button
            leftIcon={<DownloadIcon />}
            onClick={exportToCSV}
            colorScheme="blue"
            size="sm"
          >
            Export CSV
          </Button>
        </Flex>

        <Flex mb={6} gap={4}>
          <InputGroup>
            <InputLeftElement
              pointerEvents="none"
              children={<SearchIcon color="gray.300" />}
            />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxW="400px"
            />
          </InputGroup>
        </Flex>

        <TableContainer>
          <Table variant="simple" className="property-table">
            <Thead>
              <Tr>
                <Th cursor="pointer" onClick={() => handleSort('realPropertyAssetName')}>
                  Property Name {sortField === 'realPropertyAssetName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th cursor="pointer" onClick={() => handleSort('streetAddress')}>
                  Address {sortField === 'streetAddress' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th cursor="pointer" onClick={() => handleSort('city')}>
                  City {sortField === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th cursor="pointer" onClick={() => handleSort('state')}>
                  State {sortField === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th>Zip Code</Th>
                <Th cursor="pointer" onClick={() => handleSort('constructionDate')}>
                  Construction Date {sortField === 'constructionDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {currentProperties.map((property, index) => (
                <Tr key={`${property.realPropertyAssetName}-${index}`}>
                  <Td fontWeight="medium">{property.realPropertyAssetName}</Td>
                  <Td>{property.streetAddress}</Td>
                  <Td>{property.city}</Td>
                  <Td>{property.state}</Td>
                  <Td>{property.zipCode}</Td>
                  <Td>{property.constructionDate || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme={property.ownedOrLeased === 'F' ? 'green' : 'blue'}>
                      {property.ownedOrLeased === 'F' ? 'Owned' : 'Leased'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Flex justifyContent="space-between" alignItems="center" mt={6}>
          <Text fontSize="sm" color="gray.600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {formatNumber(filteredProperties.length)} properties
          </Text>
          <HStack>
            <Button
              size="sm"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Text fontSize="sm">
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              size="sm"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Box>
    </MainLayout>
  );
} 