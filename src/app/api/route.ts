import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    return NextResponse.json({ 
      message: 'Eco-Loom API is running',
      sampleData: {
        managementRoute: '/api/seed',
        note: 'Sample data is managed through the dedicated admin seed route.',
      },
    });
  } catch (error) {
    console.error('Error loading API status:', error);
    return NextResponse.json({ 
      message: 'Eco-Loom API is running',
      sampleData: {
        managementRoute: '/api/seed',
      },
    });
  }
}
