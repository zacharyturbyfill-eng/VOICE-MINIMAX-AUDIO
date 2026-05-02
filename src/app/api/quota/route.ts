import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

async function handleQuota(req: NextRequest) {
  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
    }

    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId) {
      return NextResponse.json({ error: 'API Key or Group ID not configured' }, { status: 400 });
    }

    const response = await fetch(`https://api.minimax.io/v1/token_plan/remains?GroupId=${groupId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleQuota(req);
}

export async function POST(req: NextRequest) {
  return handleQuota(req);
}
