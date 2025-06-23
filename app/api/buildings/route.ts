import { NextRequest, NextResponse } from 'next/server';
import { getAllBuildings, getBuildingsForMap, getBuildingStatistics } from '@/lib/services/supabase-data-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '999999');
    const mapData = searchParams.get('mapData') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    let buildings;

    if (mapData) {
      // For map view, get buildings with valid coordinates and apply limit
      buildings = await getBuildingsForMap(limit < 999999 ? limit : undefined);
    } else {
      // Get all buildings
      buildings = await getAllBuildings();
      
      // Apply limit if specified
      if (limit < 999999) {
        buildings = buildings.slice(0, limit);
      }
    }

    const response: any = { buildings };

    // Include statistics if requested
    if (includeStats) {
      response.stats = await getBuildingStatistics();
    }

    console.log(`📊 Loaded ${buildings.length} buildings from Supabase`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in buildings API:', error);
    return NextResponse.json(
      { error: 'Failed to load buildings data' },
      { status: 500 }
    );
  }
}
