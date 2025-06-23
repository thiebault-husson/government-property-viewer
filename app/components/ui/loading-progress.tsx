'use client';

import {
  Box,
  Progress,
  Text,
  VStack,
  Flex,
  Spinner,
  Center,
} from '@chakra-ui/react';

interface LoadingProgressProps {
  progress: number;
  message: string;
  title?: string;
  subtitle?: string;
  showSpinner?: boolean;
  height?: string;
  maxWidth?: string;
  progressColor?: string;
}

export default function LoadingProgress({
  progress,
  message,
  title = "Loading",
  subtitle,
  showSpinner = true,
  height = "500px",
  maxWidth = "500px",
  progressColor = "blue"
}: LoadingProgressProps) {
  return (
    <Center h={height}>
      <VStack spacing={6} maxW={maxWidth} w="full">
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            {title}
          </Text>
          {subtitle && (
            <Text color="gray.600" mb={6}>
              {subtitle}
            </Text>
          )}
          <Text color="gray.600" mb={6}>
            {message}
          </Text>
        </Box>
        
        <Box w="full">
          <Progress 
            value={progress} 
            size="lg" 
            colorScheme={progressColor.replace('.500', '').replace('.', '')} 
            hasStripe
            isAnimated
            borderRadius="md"
          />
          <Flex justifyContent="space-between" mt={2}>
            <Text fontSize="sm" color="gray.500">
              {progress}% Complete
            </Text>
            <Text fontSize="sm" color="gray.500">
              {progress === 100 ? 'Ready!' : 'Please wait...'}
            </Text>
          </Flex>
        </Box>
        
        {showSpinner && (
          <Spinner size="lg" color="blue.500" />
        )}
      </VStack>
    </Center>
  );
} 