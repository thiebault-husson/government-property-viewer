'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Box, Text, Center, Spinner, VStack, HStack, Select } from '@chakra-ui/react';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import { TBuilding } from '../../types/property';
import { EnhancedLeasedBuilding, EnhancedLeasedBuildingWithMultipleLeases } from '@/lib/services/lease-data-service';
import LeaseDetailModal from './LeaseDetailModal';

// Enhanced building interface with lease data (imported from service)

interface VisTimelineGanttProps {
  buildings: TBuilding[] | EnhancedLeasedBuilding[] | EnhancedLeasedBuildingWithMultipleLeases[];
  limit?: number;
  useRealLeaseData?: boolean;
  showMultipleLeases?: boolean;
}

const VisTimelineGantt: React.FC<VisTimelineGanttProps> = ({ 
  buildings, 
  limit = 10, 
  useRealLeaseData = false,
  showMultipleLeases = false
}) => {
  console.log('🔥 VisTimelineGantt component render:', {
    buildingsCount: buildings ? buildings.length : 'null/undefined',
    limit,
    useRealLeaseData,
    showMultipleLeases
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localLimit, setLocalLimit] = useState(limit);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<EnhancedLeasedBuildingWithMultipleLeases | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Use local limit if provided, otherwise use the prop
  const effectiveLimit = localLimit;

  // Format square footage helper
  const formatSquareFootage = (sqft: number): string => {
    if (sqft >= 1000000) {
      return `${(sqft / 1000000).toFixed(1)}M sq ft`;
    } else if (sqft >= 1000) {
      return `${(sqft / 1000).toFixed(0)}K sq ft`;
    }
    return `${sqft.toLocaleString()} sq ft`;
  };

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

  // Generate estimated lease dates (fallback for buildings without real lease data)
  const generateEstimatedLeaseDates = (constructionYear: number) => {
    let leaseStartYear;
    if (constructionYear < 1980) {
      leaseStartYear = Math.max(1970, constructionYear + Math.floor(Math.random() * 15) + 5);
    } else if (constructionYear < 2000) {
      leaseStartYear = Math.max(1990, constructionYear + Math.floor(Math.random() * 10) + 3);
    } else {
      leaseStartYear = Math.max(2000, constructionYear + Math.floor(Math.random() * 8) + 2);
    }

    const leaseDuration = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
    const leaseEndYear = Math.min(leaseStartYear + leaseDuration, 2024);

    return {
      startDate: new Date(leaseStartYear, 0, 1),
      endDate: new Date(leaseEndYear, 11, 31),
      isEstimated: true
    };
  };

  // Handle timeline item click
  const handleTimelineClick = useCallback((buildingIndex: number) => {
    const building = buildings[buildingIndex] as EnhancedLeasedBuildingWithMultipleLeases;
    if (building && building.leases && building.leases.length > 1) {
      setSelectedBuilding(building);
      setModalOpen(true);
    }
  }, [buildings]);

  // Memoize the timeline data calculation to prevent excessive re-renders
  const { timelineData, timelineGroups } = useMemo(() => {
    console.log('🔍 VisTimelineGantt: Starting timeline data calculation');
    console.log('📊 Buildings input:', {
      buildings: buildings ? buildings.length : 'null/undefined',
      firstBuilding: buildings?.[0] ? {
        locationCode: buildings[0].locationCode,
        realPropertyAssetName: buildings[0].realPropertyAssetName,
        hasLeases: (buildings[0] as any).leases ? (buildings[0] as any).leases.length : 'no leases property',
        hasPrimaryLease: (buildings[0] as any).primaryLease ? 'yes' : 'no'
      } : 'no first building',
      effectiveLimit,
      useRealLeaseData
    });

    try {
      // Early return if buildings array is empty or invalid
      if (!buildings || buildings.length === 0) {
        console.log('❌ No buildings data available');
        return {
          timelineData: [],
          timelineGroups: []
        };
      }

      // Prepare timeline data with real or estimated lease dates
      const data = buildings
        .filter(prop => {
          try {
            // Always require construction date
            if (!prop || !prop.constructionDate || prop.constructionDate <= 0) return false;
            
            // If using real lease data, only show buildings that have actual lease data
            if (useRealLeaseData) {
              const multiLeaseProp = prop as EnhancedLeasedBuildingWithMultipleLeases;
              const hasValidLease = multiLeaseProp.primaryLease && multiLeaseProp.primaryLease.leaseEffectiveDate && multiLeaseProp.primaryLease.leaseExpirationDate;
              if (!hasValidLease) {
                console.log('🚫 Filtered out building (no valid lease):', {
                  locationCode: prop.locationCode,
                  hasLeases: multiLeaseProp.leases ? multiLeaseProp.leases.length : 'no leases',
                  hasPrimaryLease: multiLeaseProp.primaryLease ? 'yes' : 'no',
                  primaryLeaseData: multiLeaseProp.primaryLease
                });
              }
              return hasValidLease;
            }
            
            return true;
          } catch (error) {
            console.error('❌ Error filtering building:', prop?.locationCode, error);
            return false;
          }
        })
        .slice(0, effectiveLimit)
        .flatMap((prop, buildingIndex) => {
          try {
            if (!prop) return [];
            
            const leases = [];
            
            if (useRealLeaseData) {
              // Use primary lease only for timeline display
              const multiLeaseProp = prop as EnhancedLeasedBuildingWithMultipleLeases;
              
              if (multiLeaseProp.primaryLease && multiLeaseProp.primaryLease.leaseEffectiveDate && multiLeaseProp.primaryLease.leaseExpirationDate) {
                const startDate = new Date(multiLeaseProp.primaryLease.leaseEffectiveDate);
                const endDate = new Date(multiLeaseProp.primaryLease.leaseExpirationDate);
                
                console.log('📅 Processing lease dates for building:', {
                  locationCode: prop.locationCode,
                  effectiveDate: multiLeaseProp.primaryLease.leaseEffectiveDate,
                  expirationDate: multiLeaseProp.primaryLease.leaseExpirationDate,
                  startDateValid: !isNaN(startDate.getTime()),
                  endDateValid: !isNaN(endDate.getTime())
                });
                
                // Validate dates
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  leases.push({
                    startDate,
                    endDate,
                    isEstimated: false,
                    leaseIndex: 0,
                    leaseInfo: `Lease #: ${multiLeaseProp.primaryLease.leaseNumber || 'N/A'}<br/>
                               Effective: ${formatDate(multiLeaseProp.primaryLease.leaseEffectiveDate)}<br/>
                               Expires: ${formatDate(multiLeaseProp.primaryLease.leaseExpirationDate)}<br/>
                               Duration: ${multiLeaseProp.primaryLease.leaseDurationYears || 'N/A'} years<br/>
                               Status: ${multiLeaseProp.primaryLease.leaseStatus || 'unknown'}<br/>
                               ${multiLeaseProp.leases && multiLeaseProp.leases.length > 1 ? `<em>Click to view all ${multiLeaseProp.leases.length} leases</em>` : ''}`
                  });
                } else {
                  console.warn('⚠️ Invalid dates for building:', prop.locationCode, { startDate, endDate });
                }
              }
            } else {
              // Use estimated dates only when not using real lease data
              const estimated = generateEstimatedLeaseDates(prop.constructionDate);
              leases.push({
                startDate: estimated.startDate,
                endDate: estimated.endDate,
                isEstimated: true,
                leaseIndex: 0,
                leaseInfo: `<em>Estimated lease period</em><br/>
                           Based on construction date: ${prop.constructionDate}`
              });
            }

            // Create timeline items for each lease of this building
            const timelineItems = leases.map((lease, arrayIndex) => {
              const isClickable = useRealLeaseData && 
                (prop as EnhancedLeasedBuildingWithMultipleLeases).leases && 
                (prop as EnhancedLeasedBuildingWithMultipleLeases).leases.length > 1;
              
              return {
                id: `${buildingIndex}-${lease.leaseIndex || arrayIndex}`,
                content: isClickable ? `📋 ${(prop as EnhancedLeasedBuildingWithMultipleLeases).leases.length} leases` : '', // Visual indicator for multiple leases
                start: lease.startDate,
                end: lease.endDate,
                group: buildingIndex, // Group by building
                buildingIndex, // Store building index for click handling
                title: `<strong>${prop.realPropertyAssetName || 'Unknown Building'}</strong><br/>
                        City: ${prop.city || 'N/A'}, ${prop.state || 'N/A'}<br/>
                        Construction: ${prop.constructionDate || 'N/A'}<br/>
                        ${lease.leaseInfo}<br/>
                        Square Footage: ${formatSquareFootage(prop.buildingRentableSquareFeet || 0)}
                        ${isClickable ? '<br/><strong>👆 Click anywhere on this bar to view all leases</strong>' : ''}`,
                className: `${lease.isEstimated ? 'lease-timeline-item-estimated' : 'lease-timeline-item-real'} ${isClickable ? 'lease-timeline-item-clickable' : ''}`,
                style: `${lease.isEstimated ? 'background-color: #94a3b8; border-color: #64748b;' : ''} ${isClickable ? 'cursor: pointer; border: 2px solid #3182ce;' : ''}`
              };
            });

            console.log('🏗️ Created timeline items for building:', {
              locationCode: prop.locationCode,
              itemsCount: timelineItems.length,
              items: timelineItems
            });

            return timelineItems;
          } catch (error) {
            console.warn(`❌ Error processing building at index ${buildingIndex}:`, error);
            return [];
          }
        })
        .filter(item => item !== null && item !== undefined);

      console.log('📊 Timeline data processed:', {
        totalItems: data.length,
        sampleItems: data.slice(0, 3)
      });

      // Create groups for the timeline (one group per building)
      const uniqueBuildings = buildings
        .filter(prop => {
          try {
            if (!prop || !prop.constructionDate || prop.constructionDate <= 0) return false;
            if (useRealLeaseData) {
              const multiLeaseProp = prop as EnhancedLeasedBuildingWithMultipleLeases;
              return multiLeaseProp.primaryLease && multiLeaseProp.primaryLease.leaseEffectiveDate && multiLeaseProp.primaryLease.leaseExpirationDate;
            }
            return true;
          } catch {
            return false;
          }
        })
        .slice(0, effectiveLimit)
        .map((prop, index) => ({
          id: index,
          content: `<div style="font-size: 11px; padding: 2px 4px;">
                      <strong>${prop.realPropertyAssetName || 'Unknown'}</strong><br/>
                      <span style="color: #666;">${prop.city || 'N/A'}, ${prop.state || 'N/A'}</span>
                      ${useRealLeaseData && (prop as EnhancedLeasedBuildingWithMultipleLeases).leases && (prop as EnhancedLeasedBuildingWithMultipleLeases).leases.length > 1 
                        ? `<br/><span style="color: #0066cc; font-size: 10px;">(${(prop as EnhancedLeasedBuildingWithMultipleLeases).leases.length} leases)</span>` 
                        : ''}
                    </div>`,
          className: 'timeline-group-label'
        }));

      console.log('🏢 Timeline groups created:', {
        totalGroups: uniqueBuildings.length,
        sampleGroups: uniqueBuildings.slice(0, 3)
      });

      const result = {
        timelineData: data,
        timelineGroups: uniqueBuildings
      };

      console.log('✅ Timeline calculation complete:', {
        dataItems: result.timelineData.length,
        groups: result.timelineGroups.length,
        hasValidData: result.timelineData.length > 0 && result.timelineGroups.length > 0
      });

      return result;
    } catch (error) {
      console.error('❌ Error in timeline data calculation:', error);
      return {
        timelineData: [],
        timelineGroups: []
      };
    }
  }, [buildings, effectiveLimit, useRealLeaseData]);

  useEffect(() => {
    console.log('🎯 Timeline creation useEffect triggered:', {
      timelineRef: timelineRef.current ? 'exists' : 'null',
      timelineData: timelineData ? timelineData.length : 'null/undefined',
      timelineGroups: timelineGroups ? timelineGroups.length : 'null/undefined',
      isLoading
    });

    // Don't proceed if no data, but don't check timelineRef here to avoid render loops
    if (timelineData.length === 0 || timelineGroups.length === 0) {
      console.log('❌ No timeline data available');
      setIsLoading(false);
      setError(null);
      return;
    }

    console.log('✅ Starting timeline creation process...');
    // Don't set loading here to avoid render loop
    setError(null);

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        console.log('⏰ Timeline creation timeout executed');
        
        // Double-check that the ref is still valid
        if (!timelineRef.current) {
          console.log('❌ Timeline ref no longer valid');
          setIsLoading(false);
          return;
        }

        // Destroy existing timeline
        if (timelineInstance.current) {
          try {
            console.log('🗑️ Destroying existing timeline');
            timelineInstance.current.destroy();
          } catch (error) {
            console.warn('Error destroying previous timeline:', error);
          }
          timelineInstance.current = null;
        }

        // Validate data one more time
        if (!timelineData || timelineData.length === 0 || !timelineGroups || timelineGroups.length === 0) {
          console.log('❌ No timeline data available after timeout');
          setIsLoading(false);
          return;
        }

        // Create DataSets with additional validation
        const validItems = timelineData.filter(item => 
          item && item.start && item.end && item.id !== null && item.id !== undefined
        );
        
        const validGroups = timelineGroups.filter(group => 
          group && group.id !== null && group.id !== undefined
        );

        console.log('📊 Data validation results:', {
          originalItems: timelineData.length,
          validItems: validItems.length,
          originalGroups: timelineGroups.length,
          validGroups: validGroups.length
        });

        if (validItems.length === 0 || validGroups.length === 0) {
          console.log('❌ No valid items or groups after validation');
          setIsLoading(false);
          setError('No valid timeline data available');
          return;
        }

        const items = new DataSet(validItems);
        const groups = new DataSet(validGroups);

        // Timeline options
        const options = {
          width: '100%',
          height: `${Math.max(400, validGroups.length * 35 + 100)}px`, // Keep calculated height for content
          maxHeight: 600, // Constrain maximum height
          margin: {
            item: 10,
            axis: 20
          },
          orientation: 'top',
          stack: false,
          showCurrentTime: true,
          zoomable: true,
          moveable: true,
          selectable: true,
          multiselect: false,
          verticalScroll: true, // Enable vertical scrolling
          tooltip: {
            followMouse: false,
            overflowMethod: 'cap' as const,
            delay: 300
          }
        };

        console.log('🎨 Creating timeline with options:', options);

        // Create timeline
        const timeline = new Timeline(timelineRef.current, items, groups, options);
        timelineInstance.current = timeline;

        console.log('✅ Timeline created successfully');

        // Add vertical scroll support when hovering over building names
        const addVerticalScrollSupport = () => {
          const timelineContainer = timelineRef.current;
          if (!timelineContainer) return;

          // Find the timeline elements
          const groupLabels = timelineContainer.querySelector('.vis-labelset');
          const timelinePanel = timelineContainer.querySelector('.vis-itemset');
          
          if (!groupLabels || !timelinePanel) return;

          let scrollBarVisible = false;

          // Add vertical scroll event listener
          const handleVerticalScroll = (e: WheelEvent) => {
            const isOverGroupLabels = (e.target as Element)?.closest('.vis-labelset');
            
            if (isOverGroupLabels) {
              e.preventDefault();
              
              // Get the timeline's internal scrollable container
              const visContent = timelineContainer.querySelector('.vis-content');
              const visPanel = timelineContainer.querySelector('.vis-panel');
              
              // Try different possible scroll containers
              const scrollableContainer = visContent || visPanel || timelineContainer;
              
              if (scrollableContainer) {
                const scrollAmount = e.deltaY * 0.5; // Reduce scroll speed for better control
                const currentScrollTop = scrollableContainer.scrollTop;
                const maxScrollTop = scrollableContainer.scrollHeight - scrollableContainer.clientHeight;
                const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + scrollAmount));
                
                // Apply smooth scrolling
                scrollableContainer.scrollTo({
                  top: newScrollTop,
                  behavior: 'smooth'
                });
                
                console.log('📜 Scroll applied:', {
                  scrollAmount,
                  currentScrollTop,
                  newScrollTop,
                  maxScrollTop,
                  scrollHeight: scrollableContainer.scrollHeight,
                  clientHeight: scrollableContainer.clientHeight
                });
              }
            }
          };

          // Show/hide scrollbar on hover
          const showScrollBar = () => {
            if (!scrollBarVisible) {
              const groupLabelsElement = groupLabels as HTMLElement;
              groupLabelsElement.style.cursor = 'ns-resize';
              groupLabelsElement.style.backgroundColor = '#f8fafc';
              groupLabelsElement.style.borderRight = '3px solid #3182ce';
              groupLabelsElement.title = 'Scroll vertically through building rows';
              scrollBarVisible = true;
            }
          };

          const hideScrollBar = () => {
            if (scrollBarVisible) {
              const groupLabelsElement = groupLabels as HTMLElement;
              groupLabelsElement.style.cursor = 'default';
              groupLabelsElement.style.backgroundColor = '';
              groupLabelsElement.style.borderRight = '';
              groupLabelsElement.title = '';
              scrollBarVisible = false;
            }
          };

          // Add event listeners
          timelineContainer.addEventListener('wheel', handleVerticalScroll, { passive: false });
          
          const groupLabelsElement = groupLabels as HTMLElement;
          groupLabelsElement.addEventListener('mouseenter', showScrollBar);
          groupLabelsElement.addEventListener('mouseleave', hideScrollBar);

          // Store cleanup function
          (timeline as any)._verticalScrollCleanup = () => {
            timelineContainer.removeEventListener('wheel', handleVerticalScroll);
            groupLabelsElement.removeEventListener('mouseenter', showScrollBar);
            groupLabelsElement.removeEventListener('mouseleave', hideScrollBar);
          };
        };

        // Add vertical scroll support after timeline is ready
        setTimeout(addVerticalScrollSupport, 200);

        // Add click event listener
        timeline.on('click', (properties) => {
          console.log('🖱️ Timeline click event:', properties);
          
          // Handle clicks on timeline items
          if (properties.item !== null) {
            const item = items.get(properties.item) as any;
            console.log('📋 Clicked item:', item);
            
            if (item && typeof item.buildingIndex === 'number') {
              const building = buildings[item.buildingIndex] as EnhancedLeasedBuildingWithMultipleLeases;
              console.log('🏢 Building clicked:', {
                locationCode: building?.locationCode,
                leaseCount: building?.leases?.length
              });
              
              handleTimelineClick(item.buildingIndex);
            }
          }
        });

        // Add mousedown event for more reliable clicking
        timeline.on('mousedown', (properties) => {
          if (properties.item !== null) {
            console.log('🖱️ Timeline mousedown event:', properties);
            const item = items.get(properties.item) as any;
            if (item && typeof item.buildingIndex === 'number') {
              // Store the clicked item for mouseup event
              (timeline as any)._clickedItem = item;
            }
          }
        });

        // Handle mouseup to complete the click
        timeline.on('mouseup', (properties) => {
          const clickedItem = (timeline as any)._clickedItem;
          if (clickedItem && properties.item !== null) {
            const item = items.get(properties.item) as any;
            if (item && item.id === clickedItem.id && typeof item.buildingIndex === 'number') {
              console.log('🖱️ Timeline mouseup - completing click:', item);
              handleTimelineClick(item.buildingIndex);
            }
          }
          // Clear the stored item
          (timeline as any)._clickedItem = null;
        });

        // Also add double-click for better UX
        timeline.on('doubleClick', (properties) => {
          if (properties.item !== null) {
            const item = items.get(properties.item) as any;
            if (item && typeof item.buildingIndex === 'number') {
              handleTimelineClick(item.buildingIndex);
            }
          }
        });

        // Fit the timeline to show all data with some padding
        setTimeout(() => {
          try {
            if (timelineInstance.current && timelineRef.current) {
              console.log('📏 Fitting timeline to data');
              timelineInstance.current.fit();
            }
            console.log('🎉 Timeline setup complete, setting loading to false');
            setIsLoading(false);
          } catch (fitError) {
            console.warn('Error fitting timeline:', fitError);
            setIsLoading(false);
          }
        }, 100);

      } catch (error) {
        console.error('❌ Error creating timeline:', error);
        setError('Failed to create timeline visualization');
        setIsLoading(false);
        
        // Clean up on error
        if (timelineInstance.current) {
          try {
            // Clean up vertical scroll listeners
            if ((timelineInstance.current as any)._verticalScrollCleanup) {
              (timelineInstance.current as any)._verticalScrollCleanup();
            }
            timelineInstance.current.destroy();
          } catch (destroyError) {
            console.warn('Error destroying timeline after creation error:', destroyError);
          }
          timelineInstance.current = null;
        }
      }
    }, 100); // Increased delay to ensure DOM is ready

    return () => {
      console.log('🧹 Timeline useEffect cleanup');
      clearTimeout(timeoutId);
      if (timelineInstance.current) {
        try {
          // Clean up vertical scroll listeners
          if ((timelineInstance.current as any)._verticalScrollCleanup) {
            (timelineInstance.current as any)._verticalScrollCleanup();
          }
          timelineInstance.current.destroy();
        } catch (error) {
          console.warn('Error destroying timeline in cleanup:', error);
        }
        timelineInstance.current = null;
      }
    };
  }, [timelineData, timelineGroups]);

  // Handle limit change
  const handleLimitChange = (newLimit: string) => {
    const limitValue = newLimit === 'all' ? buildings.length : parseInt(newLimit);
    setLocalLimit(limitValue);
  };

  // Show loading state while data is being fetched or processed
  console.log('🔍 Render check:', {
    isLoading,
    hasBuildings: buildings ? buildings.length : 'null/undefined',
    timelineDataLength: timelineData ? timelineData.length : 'null/undefined',
    timelineGroupsLength: timelineGroups ? timelineGroups.length : 'null/undefined'
  });

  // Only show loading for initial data fetch, not during timeline creation
  if (!buildings || buildings.length === 0 || !timelineData || timelineData.length === 0) {
    return (
      <Box position="relative" width="100%" minHeight="400px">
        {/* Control Header - Show even while loading */}
        <HStack justify="space-between" align="center" mb={4} px={2} opacity={0.5}>
          <Text fontSize="sm" color="gray.600">
            {useRealLeaseData ? 'Real lease data timeline (click buildings with multiple leases for details)' : 'Estimated lease timeline'}
          </Text>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">Show:</Text>
            <Select
              value={effectiveLimit === buildings.length ? 'all' : effectiveLimit.toString()}
              onChange={(e) => handleLimitChange(e.target.value)}
              size="sm"
              width="150px"
              isDisabled={true}
            >
              <option value="10">10 properties</option>
              <option value="50">50 properties</option>
              <option value="500">500 properties</option>
              <option value="1000">1000 properties</option>
              <option value="all">All properties</option>
            </Select>
          </HStack>
        </HStack>

        {/* Loading State */}
        <Center h="400px" border="1px solid" borderColor="gray.200" borderRadius="md" bg="gray.50">
          <VStack spacing={4}>
            <Spinner size="lg" color="blue.500" />
            <VStack spacing={2}>
              <Text fontSize="md" fontWeight="medium" color="gray.700">
                {!buildings || buildings.length === 0 ? 'Loading lease data...' : 'Preparing timeline...'}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {!buildings || buildings.length === 0 
                  ? 'Fetching government-leased building data...' 
                  : 'Processing timeline visualization...'}
              </Text>
            </VStack>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box position="relative" width="100%" minHeight="400px">
      {/* Control Header */}
      <HStack justify="space-between" align="center" mb={4} px={2}>
        <Text fontSize="sm" color="gray.600">
          {useRealLeaseData ? 'Real lease data timeline (click buildings with multiple leases for details)' : 'Estimated lease timeline'}
        </Text>
        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.600">Show:</Text>
          <Select
            value={effectiveLimit === buildings.length ? 'all' : effectiveLimit.toString()}
            onChange={(e) => handleLimitChange(e.target.value)}
            size="sm"
            width="150px"
          >
            <option value="10">10 properties</option>
            <option value="50">50 properties</option>
            <option value="500">500 properties</option>
            <option value="1000">1000 properties</option>
            <option value="all">All properties</option>
          </Select>
        </HStack>
      </HStack>

      {/* Error State */}
      {error && (
        <Center h="400px" border="1px solid" borderColor="red.200" borderRadius="md" bg="red.50">
          <VStack spacing={3}>
            <Text fontSize="lg" color="red.600" fontWeight="medium">Timeline Error</Text>
            <Text fontSize="sm" color="red.500" textAlign="center">{error}</Text>
          </VStack>
        </Center>
      )}

      {/* Timeline Container */}
      {!error && (
        <Box position="relative">
          {/* Loading overlay - only show during initial creation */}
          {isLoading && !timelineInstance.current && (
            <Box 
              position="absolute" 
              top="0" 
              left="0" 
              right="0" 
              bottom="0" 
              bg="rgba(255,255,255,0.9)" 
              zIndex={10}
              display="flex"
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
            >
              <VStack spacing={2}>
                <Spinner size="md" color="blue.500" />
                <Text fontSize="sm" color="gray.600">Creating timeline...</Text>
              </VStack>
            </Box>
          )}
          
          <Box 
            ref={timelineRef} 
            width="100%" 
            height="600px"
            maxHeight="600px"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            cursor={useRealLeaseData ? "pointer" : "default"}
            overflow="hidden"
            sx={{
              // Custom styles for timeline items
              '.lease-timeline-item-clickable': {
                cursor: 'pointer !important',
                border: '2px solid #3182ce !important',
                backgroundColor: '#ebf8ff !important',
                '&:hover': {
                  backgroundColor: '#bee3f8 !important',
                  border: '2px solid #2c5aa0 !important',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1) !important'
                }
              },
              '.lease-timeline-item-real': {
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9'
              },
              '.lease-timeline-item-estimated': {
                backgroundColor: '#94a3b8',
                border: '1px solid #64748b'
              },
              // Position tooltips above timeline items to prevent click blocking
              '.vis-tooltip': {
                transform: 'translateY(-50px) !important',
                pointerEvents: 'none !important',
                zIndex: '10000 !important',
                marginBottom: '50px !important'
              },
              // Enhanced styles for vertical scrolling on building names
              '.vis-labelset': {
                transition: 'all 0.2s ease',
                borderRight: '1px solid #e2e8f0',
                '&:hover': {
                  backgroundColor: '#f8fafc !important',
                  borderRight: '3px solid #3182ce !important',
                  cursor: 'ns-resize !important',
                  boxShadow: 'inset -3px 0 0 #3182ce'
                }
              },
              '.vis-label': {
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: '#e2e8f0 !important'
                }
              },
              // Add a subtle scrollbar indicator
              '.vis-content': {
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f5f9'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#cbd5e1',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: '#94a3b8'
                  }
                }
              }
            }}
          />
        </Box>
      )}

      {/* Lease Detail Modal */}
      <LeaseDetailModal
        building={selectedBuilding}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBuilding(null);
        }}
      />
    </Box>
  );
};

export default VisTimelineGantt;