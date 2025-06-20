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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
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
import { getAllBuildings } from '@/lib/services/property-service';
import {
  groupBuildingsByDecade,
  groupPropertiesByState,
  calculateOwnedPropertyStats,
  calculateLeasedPropertyStats,
  calculateAllBuildingsStats,
  calculateSquareFootageData,
  getOwnershipBreakdown,
  calculateSpaceUtilizationComparison,
  formatNumber,
  formatSquareFootage,
} from '@/lib/utils/data-helpers';
import { TBuilding } from '@/types/property';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function MainDashboard() {
  const [buildings, setBuildings] = useState<TBuilding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getAllBuildings();
        setBuildings(data);
      } catch (error) {
        console.error('Error fetching buildings data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Government Properties Dashboard">
        <Center>
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  // Calculate statistics
  const allStats = calculateAllBuildingsStats(buildings);
  const ownedStats = calculateOwnedPropertyStats(buildings);
  const leasedStats = calculateLeasedPropertyStats(buildings);
  
  // Chart data
  const ownershipBreakdown = getOwnershipBreakdown(buildings);
  const stateData = groupPropertiesByState(buildings);
  const decadeData = groupBuildingsByDecade(buildings);
  const spaceUtilization = calculateSpaceUtilizationComparison(buildings);

  return (
    <MainLayout title="Government Properties Dashboard">
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Government Properties Overview</Heading>
        
        {/* Overview Stats */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Stat>
            <StatLabel>Total Properties</StatLabel>
            <StatNumber>{formatNumber(allStats.totalProperties)}</StatNumber>
            <StatHelpText>All government properties</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Total Square Footage</StatLabel>
            <StatNumber>{formatSquareFootage(allStats.totalSquareFootage)}</StatNumber>
            <StatHelpText>Combined rentable space</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Federal Owned</StatLabel>
            <StatNumber>{formatNumber(ownedStats.totalProperties)}</StatNumber>
            <StatHelpText>{formatSquareFootage(ownedStats.totalSquareFootage)}</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Leased Properties</StatLabel>
            <StatNumber>{formatNumber(leasedStats.totalProperties)}</StatNumber>
            <StatHelpText>{formatSquareFootage(leasedStats.totalSquareFootage)}</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Charts Grid */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Ownership Breakdown */}
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Ownership Breakdown</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ownershipBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {ownershipBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Top States */}
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Top States by Property Count</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="owned" stackId="a" fill="#0088FE" name="Federal Owned" />
                <Bar dataKey="leased" stackId="a" fill="#00C49F" name="Leased" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Construction Timeline */}
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Construction by Decade</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={decadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3182CE" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Space Utilization Comparison */}
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Space Utilization: Owned vs Leased</Heading>
            <Tabs>
              <TabList>
                <Tab>Federal Owned</Tab>
                <Tab>Leased</Tab>
              </TabList>
              <TabPanels>
                <TabPanel p={0}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={spaceUtilization.owned}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {spaceUtilization.owned.map((entry, index) => (
                          <Cell key={`owned-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatSquareFootage(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </TabPanel>
                <TabPanel p={0}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={spaceUtilization.leased}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {spaceUtilization.leased.map((entry, index) => (
                          <Cell key={`leased-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatSquareFootage(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </SimpleGrid>

        {/* Detailed Statistics */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Federal Owned Properties</Heading>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontSize="sm" color="gray.600">Total Properties</Text>
                <Text fontSize="lg" fontWeight="bold">{formatNumber(ownedStats.totalProperties)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Average Size</Text>
                <Text fontSize="lg" fontWeight="bold">{formatSquareFootage(ownedStats.averageSquareFootage)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Oldest Building</Text>
                <Text fontSize="sm">{ownedStats.oldestBuilding}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Newest Building</Text>
                <Text fontSize="sm">{ownedStats.newestBuilding}</Text>
              </Box>
            </VStack>
          </Box>

          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Leased Properties</Heading>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontSize="sm" color="gray.600">Total Properties</Text>
                <Text fontSize="lg" fontWeight="bold">{formatNumber(leasedStats.totalProperties)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Average Size</Text>
                <Text fontSize="lg" fontWeight="bold">{formatSquareFootage(leasedStats.averageSquareFootage)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Oldest Building</Text>
                <Text fontSize="sm">{leasedStats.oldestBuilding}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Newest Building</Text>
                <Text fontSize="sm">{leasedStats.newestBuilding}</Text>
              </Box>
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </MainLayout>
  );
} 