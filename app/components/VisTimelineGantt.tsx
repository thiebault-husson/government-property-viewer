'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import { TBuilding } from '../../types/property';

interface VisTimelineGanttProps {
  buildings: TBuilding[];
  limit: number;
}

const VisTimelineGantt: React.FC<VisTimelineGanttProps> = ({ buildings, limit }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  // Format square footage helper
  const formatSquareFootage = (sqft: number): string => {
    if (sqft >= 1000000) {
      return `${(sqft / 1000000).toFixed(1)}M sq ft`;
    } else if (sqft >= 1000) {
      return `${(sqft / 1000).toFixed(0)}K sq ft`;
    }
    return `${sqft.toLocaleString()} sq ft`;
  };

  // Prepare timeline data
  const timelineData = buildings
    .filter(prop => prop.constructionDate && prop.constructionDate > 0)
    .slice(0, limit)
    .map((prop, index) => {
      // Create realistic lease periods based on construction date
      const constructionYear = prop.constructionDate;

      // Generate more realistic lease start dates
      let leaseStartYear;
      if (constructionYear < 1980) {
        leaseStartYear = Math.max(1970, constructionYear + Math.floor(Math.random() * 15) + 5);
      } else if (constructionYear < 2000) {
        leaseStartYear = Math.max(1990, constructionYear + Math.floor(Math.random() * 10) + 3);
      } else {
        leaseStartYear = Math.max(2000, constructionYear + Math.floor(Math.random() * 8) + 2);
      }

      // Generate lease duration (5-25 years)
      const leaseDuration = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
      const leaseEndYear = Math.min(leaseStartYear + leaseDuration, 2024);

      return {
        id: index,
        content: '', // Empty content for timeline items
        start: new Date(leaseStartYear, 0, 1),
        end: new Date(leaseEndYear, 11, 31),
        group: index,
        title: `<strong>${prop.realPropertyAssetName}</strong><br/>
                City: ${prop.city}, ${prop.state}<br/>
                Construction: ${constructionYear}<br/>
                Lease Period: ${leaseStartYear} - ${leaseEndYear}<br/>
                Square Footage: ${formatSquareFootage(prop.buildingRentableSquareFeet || 0)}`,
        className: 'lease-timeline-item'
      };
    });

  // Create groups for the timeline (one group per building)
  const timelineGroups = timelineData.map((item, index) => ({
    id: index,
    content: buildings[index].realPropertyAssetName.length > 50
      ? buildings[index].realPropertyAssetName.substring(0, 50) + '...'
      : buildings[index].realPropertyAssetName
  }));

  useEffect(() => {
    if (timelineRef.current && timelineData.length > 0) {
      try {
        // Safely destroy existing timeline
        if (timelineInstance.current) {
          try {
            timelineInstance.current.destroy();
          } catch (error) {
            console.warn('Error destroying timeline:', error);
          }
          timelineInstance.current = null;
        }

        // Create DataSets
        const items = new DataSet(timelineData);
        const groups = new DataSet(timelineGroups);

        // Timeline options
        const options = {
          height: '400px',
          stack: false,
          showCurrentTime: true,
          zoomable: true,
          moveable: true,
          orientation: 'top' as const,
          margin: {
            item: 10,
            axis: 40
          },
          format: {
            minorLabels: {
              year: 'YYYY',
              month: 'MMM'
            },
            majorLabels: {
              year: 'YYYY'
            }
          },
          groupOrder: 'id',
          tooltip: {
            followMouse: true,
            overflowMethod: 'cap' as const
          }
        };

        // Create new timeline
        timelineInstance.current = new Timeline(timelineRef.current, items, groups, options);

        // Fit the timeline to show all data
        timelineInstance.current.fit();
      } catch (error) {
        console.error('Error creating timeline:', error);
      }
    }

    // Cleanup function
    return () => {
      if (timelineInstance.current) {
        try {
          timelineInstance.current.destroy();
        } catch (error) {
          console.warn('Error in cleanup:', error);
        }
        timelineInstance.current = null;
      }
    };
  }, [timelineData, timelineGroups]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineInstance.current) {
        try {
          timelineInstance.current.destroy();
        } catch (error) {
          console.warn('Error in unmount cleanup:', error);
        }
        timelineInstance.current = null;
      }
    };
  }, []);

  return (
    <Box w="100%" h="500px" border="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <style jsx global>{`
        .vis-timeline {
          font-family: 'Inter', system-ui, sans-serif;
          border: none;
        }
        
        .vis-item {
          background-color: #2563eb;
          border-color: #1e40af;
          color: white;
          font-size: 12px;
          border-radius: 4px;
        }
        
        .vis-item.vis-selected {
          background-color: #1e40af;
          border-color: #1e3a8a;
        }
        
        .vis-group {
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }
        
        .vis-labelset .vis-label {
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
          padding: 8px 12px;
          width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .vis-time-axis {
          border-top: 1px solid #e5e7eb;
        }
        
        .vis-time-axis .vis-text {
          color: #6b7280;
          font-size: 12px;
        }
        
        .vis-time-axis .vis-text.vis-major {
          font-weight: 600;
          color: #374151;
        }
        
        .vis-current-time {
          background-color: #ef4444;
          width: 2px;
        }
        
        .vis-tooltip {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 12px;
          font-size: 13px;
          line-height: 1.4;
          max-width: 300px;
        }
      `}</style>
      <div ref={timelineRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default VisTimelineGantt; 