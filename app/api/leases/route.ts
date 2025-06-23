import { NextRequest, NextResponse } from 'next/server';
import { getAllLeaseData, getLeasedBuildings, getLeaseStatistics } from '@/lib/services/supabase-data-service';
import { enhanceLeasedBuildingsWithMultipleLeases } from '@/lib/services/lease-data-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'enhanced';
    const includeStats = searchParams.get('includeStats') === 'true';

    if (format === 'raw') {
      // Return raw lease records for table display
      const leaseRecords = await getAllLeaseData();
      
      const response: any = { buildings: leaseRecords };
      
      if (includeStats) {
        response.stats = await getLeaseStatistics();
      }
      
      return NextResponse.json(response);
      
    } else {
      // Return enhanced buildings with multiple leases for Gantt chart
      const leasedBuildings = await getLeasedBuildings();
      
      // Get all lease data for enhancement
      const allLeaseData = await getAllLeaseData();
      
      // Enhance buildings with multiple lease data
      const enhancedBuildings = enhanceLeasedBuildingsWithMultipleLeases(leasedBuildings, allLeaseData);
      
      // Calculate statistics for enhanced format
      const multiLeaseBuildings = enhancedBuildings.filter(b => b.leases && b.leases.length > 1);
      
      const maxLeasesPerBuilding = enhancedBuildings.reduce((max, b) => 
        Math.max(max, b.leases ? b.leases.length : 0), 0);
      
      let stats: any = {};
      
      if (includeStats) {
        // Get base lease statistics
        stats = await getLeaseStatistics();
        
        // Add multiple lease specific stats
        (stats as any).buildingsWithMultipleLeases = multiLeaseBuildings.length;
        (stats as any).averageLeasesPerBuilding = enhancedBuildings.length > 0 
          ? enhancedBuildings.reduce((sum, b) => sum + (b.leases ? b.leases.length : 0), 0) / enhancedBuildings.length 
          : 0;
        (stats as any).maxLeasesPerBuilding = maxLeasesPerBuilding;
      }
      
      const response: any = { buildings: enhancedBuildings };
      if (includeStats) {
        response.stats = stats;
      }
      
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Error in leases API:', error);
    return NextResponse.json(
      { error: 'Failed to load lease data' },
      { status: 500 }
    );
  }
}
