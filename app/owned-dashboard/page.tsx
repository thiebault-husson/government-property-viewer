'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardHeader,
  CardBody,
  Text,
  Spinner,
  Center,
  VStack,
  SimpleGrid,
  Heading,
  Badge,
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
import MainLayout from '@/app/components/layout/main-layout';
import { getOwnedPropertiesForDashboard } from '@/lib/services/property-service';
import {
  groupBuildingsByDecade,
  calculateOwnedPropertyStats,
  calculateSquareFootageData,
  formatNumber,
  formatSquareFootage,
} from '@/lib/utils/data-helpers';
import { TBuilding } from '@/types/property';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function FederalOwnedDashboard() {
  // State for federally-owned buildings (filtered from buildings collection where ownedOrLeased = 'F')
  const [federalOwnedBuildings, setFederalOwnedBuildings] = useState<TBuilding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFederalOwnedProperties() {
      try {
        setLoading(true);
        // This function already filters for ownedOrLeased === 'F' from the buildings collection
        const federalOwnedData = await getOwnedPropertiesForDashboard();
        setFederalOwnedBuildings(federalOwnedData);
      } catch (error) {
        console.error('Error fetching federal owned properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFederalOwnedProperties();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Federal Owned Properties Dashboard">
        <Center>
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  // Calculate statistics for federal owned properties only
  const federalOwnedStats = calculateOwnedPropertyStats(federalOwnedBuildings);
  const constructionDecadeData = groupBuildingsByDecade(federalOwnedBuildings);
  const spaceUtilizationData = calculateSquareFootageData(federalOwnedBuildings, 'owned');

  return (
    <MainLayout title="Federal Owned Properties Dashboard">
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Federal Owned Properties Dashboard</Heading>
          <Text color="gray.600" fontSize="md">
            Showing only federally-owned buildings (ownedOrLeased = 'F') from the government property portfolio
          </Text>
          <Badge colorScheme="blue" mt={2}>Federal Properties Only</Badge>
        </Box>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Stat>
            <StatLabel>Federal Owned Properties</StatLabel>
            <StatNumber>{formatNumber(federalOwnedStats.totalProperties)}</StatNumber>
            <StatHelpText>Government-owned buildings</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Total Square Footage</StatLabel>
            <StatNumber>{formatSquareFootage(federalOwnedStats.totalSquareFootage)}</StatNumber>
            <StatHelpText>Federal owned rentable space</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Average Building Size</StatLabel>
            <StatNumber>{formatSquareFootage(federalOwnedStats.averageSquareFootage)}</StatNumber>
            <StatHelpText>Per federal property</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Portfolio Age Range</StatLabel>
            <StatNumber>Mixed</StatNumber>
            <StatHelpText>Various construction dates</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Detailed Stats Cards */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Portfolio Details</Heading>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontSize="sm" color="gray.600">Oldest Federal Building</Text>
                <Text fontSize="sm" fontWeight="medium">{federalOwnedStats.oldestBuilding}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Newest Federal Building</Text>
                <Text fontSize="sm" fontWeight="medium">{federalOwnedStats.newestBuilding}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Total Portfolio Value</Text>
                <Text fontSize="sm" fontWeight="medium">Federal Investment</Text>
              </Box>
            </VStack>
          </Box>

          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Space Efficiency</Heading>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontSize="sm" color="gray.600">Utilization Rate</Text>
                <Text fontSize="lg" fontWeight="bold" color="green.500">
                  {spaceUtilizationData.length > 0 ? 'Optimized' : 'Calculating...'}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Management Type</Text>
                <Text fontSize="sm" fontWeight="medium">Direct Federal Ownership</Text>
              </Box>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Charts */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Federal Buildings by Construction Decade</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={constructionDecadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3182CE" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Federal Property Space Utilization</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spaceUtilizationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {spaceUtilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatSquareFootage(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </SimpleGrid>
      </VStack>
    </MainLayout>
  );
} 