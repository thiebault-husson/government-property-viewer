'use client';

import React from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { Box, Text } from '@chakra-ui/react';

interface DataPoint {
  name: string;
  value: number;
}

interface ModernBarChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  primaryColor?: string;
  gradientColor?: string;
}

const defaultMargin = { top: 20, right: 20, bottom: 40, left: 60 };

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

export default function ModernBarChart({
  data,
  width,
  height,
  margin = defaultMargin,
  primaryColor = '#2563eb',
  gradientColor = '#3b82f6'
}: ModernBarChartProps) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<DataPoint>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Scales
  const xScale = scaleBand<string>({
    range: [0, xMax],
    round: true,
    domain: data.map(d => d.name),
    padding: 0.3,
  });

  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    round: true,
    domain: [0, Math.max(...data.map(d => d.value))],
    nice: true,
  });

  return (
    <Box position="relative">
      <svg ref={containerRef} width={width} height={height}>
        <LinearGradient
          id="bar-gradient"
          from={primaryColor}
          to={gradientColor}
          toOpacity={0.8}
        />
        
        <Group left={margin.left} top={margin.top}>
          {/* Grid lines */}
          <GridRows
            scale={yScale}
            width={xMax}
            strokeDasharray="2,2"
            stroke="#f1f5f9"
            strokeOpacity={0.8}
            pointerEvents="none"
          />
          
          {/* Bars */}
          {data.map((d) => {
            const barWidth = xScale.bandwidth();
            const barHeight = yMax - (yScale(d.value) ?? 0);
            const barX = xScale(d.name);
            const barY = yMax - barHeight;
            
            return (
              <Bar
                key={`bar-${d.name}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill="url(#bar-gradient)"
                rx={4}
                onMouseLeave={() => {
                  hideTooltip();
                }}
                onMouseMove={(event) => {
                  const eventSvgCoords = localPoint(event);
                  const left = (barX || 0) + barWidth / 2;
                  showTooltip({
                    tooltipData: d,
                    tooltipTop: eventSvgCoords?.y,
                    tooltipLeft: left,
                  });
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                }}
                className="hover:opacity-80"
              />
            );
          })}
          
          {/* Axes */}
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="#e2e8f0"
            tickStroke="#64748b"
            tickLabelProps={{
              fill: '#64748b',
              fontSize: 12,
              textAnchor: 'middle',
              fontWeight: 500,
            }}
          />
          
          <AxisLeft
            scale={yScale}
            stroke="#e2e8f0"
            tickStroke="#64748b"
            tickLabelProps={{
              fill: '#64748b',
              fontSize: 12,
              textAnchor: 'end',
              dx: '-0.25em',
              dy: '0.25em',
              fontWeight: 500,
            }}
            numTicks={6}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <Box textAlign="center">
            <Text fontSize="sm" fontWeight="600" mb={1}>
              {tooltipData.name}
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {tooltipData.value.toLocaleString()}
            </Text>
          </Box>
        </TooltipInPortal>
      )}
    </Box>
  );
} 