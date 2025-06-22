'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid
} from '@chakra-ui/react';
import { EnhancedLeasedBuildingWithMultipleLeases } from '@/lib/services/lease-data-service';

interface LeaseDetailModalProps {
  building: EnhancedLeasedBuildingWithMultipleLeases | null;
  isOpen: boolean;
  onClose: () => void;
}

const LeaseDetailModal: React.FC<LeaseDetailModalProps> = ({ building, isOpen, onClose }) => {
  if (!building) return null;

  // Format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'green';
      case 'expired': return 'red';
      case 'upcoming': return 'blue';
      default: return 'gray';
    }
  };

  // Format square footage
  const formatSquareFootage = (sqft: number): string => {
    if (sqft >= 1000000) {
      return `${(sqft / 1000000).toFixed(1)}M sq ft`;
    } else if (sqft >= 1000) {
      return `${(sqft / 1000).toFixed(0)}K sq ft`;
    }
    return `${sqft.toLocaleString()} sq ft`;
  };

  // Sort leases by effective date
  const sortedLeases = [...building.leases].sort((a, b) => {
    const dateA = a.leaseEffectiveDateParsed instanceof Date 
      ? a.leaseEffectiveDateParsed 
      : new Date(a.leaseEffectiveDate || '');
    const dateB = b.leaseEffectiveDateParsed instanceof Date 
      ? b.leaseEffectiveDateParsed 
      : new Date(b.leaseEffectiveDate || '');
    
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate lease statistics
  const activeLeases = building.leases.filter(l => l.leaseStatus === 'active').length;
  const expiredLeases = building.leases.filter(l => l.leaseStatus === 'expired').length;
  const upcomingLeases = building.leases.filter(l => l.leaseStatus === 'upcoming').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text fontSize="xl" fontWeight="bold">
              {building.realPropertyAssetName || 'Unknown Building'}
            </Text>
            <HStack spacing={4} fontSize="sm" color="gray.600">
              <Text>{building.city}, {building.state}</Text>
              <Text>•</Text>
              <Text>Location Code: {building.locationCode}</Text>
              <Text>•</Text>
              <Text>{formatSquareFootage(building.buildingRentableSquareFeet || 0)}</Text>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Summary Statistics */}
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                Lease Summary
              </Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Leases</StatLabel>
                  <StatNumber>{building.leases.length}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Active</StatLabel>
                  <StatNumber color="green.500">{activeLeases}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Expired</StatLabel>
                  <StatNumber color="red.500">{expiredLeases}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Upcoming</StatLabel>
                  <StatNumber color="blue.500">{upcomingLeases}</StatNumber>
                </Stat>
              </SimpleGrid>
            </Box>

            <Divider />

            {/* Primary Lease Info */}
            {building.primaryLease && (
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  Primary Lease
                </Text>
                <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold">{building.primaryLease.leaseNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {formatDate(building.primaryLease.leaseEffectiveDate || '')} → {formatDate(building.primaryLease.leaseExpirationDate || '')}
                      </Text>
                      <Text fontSize="sm">
                        Duration: {building.primaryLease.leaseDurationYears} years
                      </Text>
                    </VStack>
                    <Badge colorScheme={getStatusColor(building.primaryLease.leaseStatus || 'unknown')} size="lg">
                      {building.primaryLease.leaseStatus?.toUpperCase()}
                    </Badge>
                  </HStack>
                </Box>
              </Box>
            )}

            <Divider />

            {/* All Leases Table */}
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                All Leases ({building.leases.length})
              </Text>
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Lease Number</Th>
                      <Th>Status</Th>
                      <Th>Effective Date</Th>
                      <Th>Expiration Date</Th>
                      <Th>Duration</Th>
                      <Th>Primary</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedLeases.map((lease, index) => {
                      const isPrimary = building.primaryLease?.leaseNumber === lease.leaseNumber;
                      return (
                        <Tr key={index} bg={isPrimary ? 'blue.50' : undefined}>
                          <Td fontWeight={isPrimary ? 'semibold' : 'normal'}>
                            {lease.leaseNumber}
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(lease.leaseStatus)} size="sm">
                              {lease.leaseStatus.toUpperCase()}
                            </Badge>
                          </Td>
                          <Td>{formatDate(lease.leaseEffectiveDate)}</Td>
                          <Td>{formatDate(lease.leaseExpirationDate)}</Td>
                          <Td>{lease.leaseDurationYears} years</Td>
                          <Td>
                            {isPrimary && (
                              <Badge colorScheme="blue" size="sm">
                                PRIMARY
                              </Badge>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>

            {/* Building Details */}
            <Divider />
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                Building Information
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <VStack align="start" spacing={2}>
                  <Text><strong>Installation:</strong> {building.installationName || 'N/A'}</Text>
                  <Text><strong>Address:</strong> {building.streetAddress || 'N/A'}</Text>
                  <Text><strong>Construction Year:</strong> {building.constructionDate || 'N/A'}</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text><strong>GSA Region:</strong> {building.gsaRegion || 'N/A'}</Text>
                  <Text><strong>Congressional District:</strong> {building.congressionalDistrict || 'N/A'}</Text>
                  <Text><strong>Available Space:</strong> {formatSquareFootage(building.availableSquareFeet || 0)}</Text>
                </VStack>
              </SimpleGrid>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LeaseDetailModal; 