'use client';

import React from 'react';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { Box, Text, VStack, HStack, SimpleGrid } from '@chakra-ui/react';
import { formatSquareFootage } from '@/lib/utils/data-helpers';

interface DataPoint {
  name: string;
  value: number;
}

interface ModernPieChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  colors?: string[];
  showLegend?: boolean;
}

const defaultMargin = { top: 10, right: 10, bottom: 10, left: 10 };
const defaultColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: 'rgba(0,0,0,0.9)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: '500',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
};

export default function ModernPieChart({
  data,
  width,
  height,
  margin = defaultMargin,
  colors = defaultColors,
  showLegend = true
}: ModernPieChartProps) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<DataPoint & { percentage: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Adjust layout for legend
  const legendHeight = showLegend ? 80 : 0;
  const explanationHeight = 40;
  const availableChartHeight = height - legendHeight - explanationHeight - margin.top - margin.bottom;
  
  // Bounds for chart area
  const innerWidth = width - margin.left - margin.right;
  const radius = Math.min(innerWidth, availableChartHeight) / 2 - 10;
  const centerY = availableChartHeight / 2;
  const centerX = innerWidth / 2;

  // Color scale
  const colorScale = scaleOrdinal({
    domain: data.map(d => d.name),
    range: colors,
  });

  return (
    <VStack spacing={3} align="stretch" height="100%">
      {/* Chart */}
      <Box position="relative" flex="1">
        <svg ref={containerRef} width={width} height={availableChartHeight + margin.top + margin.bottom}>
          <Group left={centerX + margin.left} top={centerY + margin.top}>
            <Pie
              data={data}
              pieValue={(d) => d.value}
              outerRadius={radius}
              innerRadius={radius * 0.6}
              cornerRadius={3}
              padAngle={0.01}
            >
              {(pie) => {
                return pie.arcs.map((arc, index) => {
                  const [centroidX, centroidY] = pie.path.centroid(arc);
                  const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;
                  const arcPath = pie.path(arc) || '';
                  const percentage = ((arc.data.value / total) * 100);
                  
                  return (
                    <g key={`arc-${arc.data.name}`}>
                      <path
                        d={arcPath}
                        fill={colorScale(arc.data.name)}
                        onMouseMove={(event) => {
                          const eventSvgCoords = localPoint(event);
                          showTooltip({
                            tooltipData: { ...arc.data, percentage },
                            tooltipTop: eventSvgCoords?.y,
                            tooltipLeft: eventSvgCoords?.x,
                          });
                        }}
                        onMouseLeave={() => {
                          hideTooltip();
                        }}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                        }}
                        className="hover:opacity-80"
                      />
                      {hasSpaceForLabel && (
                        <text
                          x={centroidX}
                          y={centroidY}
                          dy=".33em"
                          fontSize={11}
                          fontWeight={600}
                          fill="white"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {percentage.toFixed(0)}%
                        </text>
                      )}
                    </g>
                  );
                });
              }}
            </Pie>
          </Group>
        </svg>

        {/* Tooltip */}
        {tooltipOpen && tooltipData && (
          <TooltipInPortal
            top={tooltipTop}
            left={tooltipLeft}
            style={tooltipStyles}
          >
            <VStack spacing={1} align="center">
              <Text fontSize="sm" fontWeight="600">
                {tooltipData.name}
              </Text>
              <Text fontSize="lg" fontWeight="bold">
                {formatSquareFootage(tooltipData.value)}
              </Text>
              <Text fontSize="sm" opacity={0.8}>
                {tooltipData.percentage.toFixed(1)}% of total
              </Text>
            </VStack>
          </TooltipInPortal>
        )}
      </Box>

      {/* Compact Legend */}
      {showLegend && (
        <SimpleGrid columns={2} spacing={2} fontSize="xs">
          {data.map((item, index) => (
            <HStack key={item.name} spacing={2} align="center">
              <Box
                w={2}
                h={2}
                borderRadius="full"
                bg={colors[index % colors.length]}
                flexShrink={0}
              />
              <Text fontSize="xs" fontWeight="500" flex={1} noOfLines={1}>
                {item.name}
              </Text>
            </HStack>
          ))}
        </SimpleGrid>
      )}

      {/* Explanation Legend */}
      <Box
        bg="gray.50"
        p={2}
        borderRadius="md"
        borderLeft="3px solid"
        borderLeftColor="blue.500"
      >
        <Text fontSize="xs" color="gray.700" fontWeight="500">
          <strong>Calculation:</strong> Utilized space = Total rentable space - Available space
        </Text>
      </Box>
    </VStack>
  );
} 