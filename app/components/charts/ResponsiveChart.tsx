'use client';

import React from 'react';
import { ParentSize } from '@visx/responsive';
import { Box } from '@chakra-ui/react';

interface ResponsiveChartProps {
  children: (params: { width: number; height: number }) => React.ReactNode;
  height?: number | string;
  minHeight?: number;
}

export default function ResponsiveChart({ 
  children, 
  height = 300,
  minHeight = 250 
}: ResponsiveChartProps) {
  return (
    <Box width="100%" height={height} minHeight={minHeight}>
      <ParentSize>
        {({ width, height }) => children({ width: width || 0, height: height || 0 })}
      </ParentSize>
    </Box>
  );
} 