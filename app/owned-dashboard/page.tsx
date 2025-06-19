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
  groupOwnedPropertiesByDecade,
  calculateOwnedPropertyStats,
  calculateSquareFootageData,
  formatNumber,
  formatSquareFootage,
} from '@/lib/utils/data-helpers';
import { TOwnedProperty } from '@/types/property';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function OwnedDashboardPage() {
  const [properties, setProperties] = useState<TOwnedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getOwnedPropertiesForDashboard();
      setProperties(data);
    } catch (error) {
      console.error('Error loading owned properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Owned Properties Dashboard">
        <Center h="400px">
          <Spinner size="xl" />
        </Center>
      </MainLayout>
    );
  }

  const stats = calculateOwnedPropertyStats(properties);
  const decadeData = groupOwnedPropertiesByDecade(properties);
  const squareFootageData = calculateSquareFootageData(properties);

  return (
    <MainLayout title="Owned Properties Dashboard">
      <Box>
        {/* Statistics Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6} mb={8}>
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Properties</StatLabel>
                  <StatNumber>{formatNumber(stats.totalProperties)}</StatNumber>
                  <StatHelpText>Government-owned buildings</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Square Footage</StatLabel>
                  <StatNumber>{formatSquareFootage(stats.totalSquareFootage)}</StatNumber>
                  <StatHelpText>Rentable space</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Average Size</StatLabel>
                  <StatNumber>{formatSquareFootage(stats.averageSquareFootage)}</StatNumber>
                  <StatHelpText>Per property</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Charts */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} mb={8}>
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Properties by Construction Decade
                </Text>
              </CardHeader>
              <CardBody>
                <Box className="chart-container">
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
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Space Utilization
                </Text>
              </CardHeader>
              <CardBody>
                <Box className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={squareFootageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {squareFootageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatSquareFootage(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Building Information */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Oldest Building
                </Text>
              </CardHeader>
              <CardBody>
                <Text fontSize="sm">{stats.oldestBuilding}</Text>
              </CardBody>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardHeader>
                <Text fontSize="lg" fontWeight="bold">
                  Newest Building
                </Text>
              </CardHeader>
              <CardBody>
                <Text fontSize="sm">{stats.newestBuilding}</Text>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </Box>
    </MainLayout>
  );
} 