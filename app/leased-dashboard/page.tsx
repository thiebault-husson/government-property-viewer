'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Spinner,
  Center,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MainLayout from '@/app/components/layout/main-layout';
import { getLeasedPropertiesForDashboard } from '@/lib/services/property-service';
import { formatDate, formatNumber, formatSquareFootage } from '@/lib/utils/data-helpers';
import { TLeasedProperty } from '@/types/property';

export default function LeasedDashboardPage() {
  const [properties, setProperties] = useState<TLeasedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getLeasedPropertiesForDashboard();
      setProperties(data);
    } catch (error) {
      console.error('Error loading leased properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Leased Properties Dashboard">
        <Center h="400px">
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  // Calculate lease statistics
  const totalProperties = properties.length;
  const totalSquareFootage = properties.reduce(
    (sum, prop) => sum + (prop.buildingRentableSquareFeet || 0),
    0
  );
  const averageSquareFootage = totalProperties > 0 ? totalSquareFootage / totalProperties : 0;

  // Prepare Gantt chart data (simplified bar chart showing lease durations)
  const ganttData = properties
    .filter(prop => prop.leaseEffectiveDate && prop.leaseExpirationDate)
    .slice(0, 20) // Limit to first 20 for visibility
    .map(prop => {
      const startDate = new Date(prop.leaseEffectiveDate);
      const endDate = new Date(prop.leaseExpirationDate);
      const durationYears = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      return {
        name: prop.realPropertyAssetName.substring(0, 30) + (prop.realPropertyAssetName.length > 30 ? '...' : ''),
        duration: Math.round(durationYears * 10) / 10,
        startYear: startDate.getFullYear(),
        endYear: endDate.getFullYear(),
      };
    })
    .sort((a, b) => b.duration - a.duration);

  // Get upcoming lease expirations (next 2 years)
  const upcomingExpirations = properties
    .filter(prop => {
      if (!prop.leaseExpirationDate) return false;
      const expirationDate = new Date(prop.leaseExpirationDate);
      const now = new Date();
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(now.getFullYear() + 2);
      return expirationDate >= now && expirationDate <= twoYearsFromNow;
    })
    .sort((a, b) => new Date(a.leaseExpirationDate).getTime() - new Date(b.leaseExpirationDate).getTime())
    .slice(0, 10);

  return (
    <MainLayout title="Leased Properties Dashboard">
      <Box>
        {/* Statistics Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6} mb={8}>
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Leased Properties</StatLabel>
                  <StatNumber>{formatNumber(totalProperties)}</StatNumber>
                  <StatHelpText>Active leases</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Leased Space</StatLabel>
                  <StatNumber>{formatSquareFootage(totalSquareFootage)}</StatNumber>
                  <StatHelpText>Rentable space</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Average Lease Size</StatLabel>
                  <StatNumber>{formatSquareFootage(averageSquareFootage)}</StatNumber>
                  <StatHelpText>Per property</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Expiring Soon</StatLabel>
                  <StatNumber>{upcomingExpirations.length}</StatNumber>
                  <StatHelpText>Next 2 years</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Lease Duration Chart */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6} mb={8}>
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Lease Durations (Top 20)
                </Text>
              </CardHeader>
              <CardBody>
                <Box className="chart-container" h="400px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ganttData} layout="horizontal" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="duration" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip
                        formatter={(value, name) => [`${value} years`, 'Duration']}
                        labelFormatter={(label) => `Property: ${label}`}
                      />
                      <Bar dataKey="duration" fill="#3182CE" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Upcoming Lease Expirations
                </Text>
              </CardHeader>
              <CardBody>
                <Box maxH="400px" overflowY="auto">
                  {upcomingExpirations.length > 0 ? (
                    upcomingExpirations.map((prop, index) => (
                      <Box key={index} p={3} borderBottom="1px" borderColor="gray.200">
                        <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                          {prop.realPropertyAssetName}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {prop.city}, {prop.state}
                        </Text>
                        <Badge colorScheme="orange" mt={1}>
                          Expires {formatDate(prop.leaseExpirationDate)}
                        </Badge>
                      </Box>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      No leases expiring in the next 2 years
                    </Text>
                  )}
                </Box>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Leased Properties Table */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="bold">
              Leased Properties Overview
            </Text>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Building Name</Th>
                    <Th>City</Th>
                    <Th>State</Th>
                    <Th>Start Date</Th>
                    <Th>End Date</Th>
                    <Th>Square Footage</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {properties.slice(0, 50).map((property, index) => (
                    <Tr key={index}>
                      <Td fontWeight="medium" maxW="300px" noOfLines={2}>
                        {property.realPropertyAssetName}
                      </Td>
                      <Td>{property.city}</Td>
                      <Td>{property.state}</Td>
                      <Td>{formatDate(property.leaseEffectiveDate)}</Td>
                      <Td>{formatDate(property.leaseExpirationDate)}</Td>
                      <Td>{formatSquareFootage(property.buildingRentableSquareFeet || 0)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            {properties.length > 50 && (
              <Text fontSize="sm" color="gray.500" mt={4}>
                Showing first 50 properties. Total: {formatNumber(properties.length)}
              </Text>
            )}
          </CardBody>
        </Card>
      </Box>
    </MainLayout>
  );
} 