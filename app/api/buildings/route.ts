import { NextRequest, NextResponse } from 'next/server';
import { getAllBuildings, getLeasedBuildings, getOwnedBuildings, getBuildingStatistics } from '@/lib/services/supabase-data-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const includeStats = searchParams.get('includeStats') === 'true';

    let buildings;
    switch (type) {
      case 'leased':
        buildings = await getLeasedBuildings();
        break;
      case 'owned':
        buildings = await getOwnedBuildings();
        break;
      default:
        buildings = await getAllBuildings();
    }

    const response: any = { buildings };

    if (includeStats) {
      response.stats = await getBuildingStatistics();
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in buildings API:', error);
    return NextResponse.json(
      { error: 'Failed to load building data' },
      { status: 500 }
    );
  }
}
