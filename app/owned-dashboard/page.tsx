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
  const decadeData = groupBuildingsByDecade(properties);
  const squareFootageData = calculateSquareFootageData(properties);

  return (
    <MainLayout title="Owned Properties Dashboard">
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Owned Properties Dashboard</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Stat>
            <StatLabel>Total Properties</StatLabel>
            <StatNumber>{formatNumber(stats.totalProperties)}</StatNumber>
            <StatHelpText>Government-owned buildings</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Total Square Footage</StatLabel>
            <StatNumber>{formatSquareFootage(stats.totalSquareFootage)}</StatNumber>
            <StatHelpText>Rentable space</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Average Size</StatLabel>
            <StatNumber>{formatSquareFootage(stats.averageSquareFootage)}</StatNumber>
            <StatHelpText>Per property</StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Portfolio Age</StatLabel>
            <StatNumber>Mixed</StatNumber>
            <StatHelpText>Various construction dates</StatHelpText>
          </Stat>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
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

          <Box p={6} bg="white" rounded="lg" shadow="md">
            <Heading size="md" mb={4}>Space Utilization</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={squareFootageData}
                  cx="50%"
                  cy="50%"
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
        </SimpleGrid>
      </VStack>
    </MainLayout>
  );
} 