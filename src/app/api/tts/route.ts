import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

const ALLOWED_MODELS = new Set([
  'speech-2.8-turbo',
  'speech-2.6-turbo',
  'speech-02-turbo',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId) {
      return NextResponse.json({ error: 'API Key or Group ID not configured' }, { status: 400 });
    }

    const payload = { ...body };
    delete payload.apiKey;
    delete payload.groupId;
    if (!ALLOWED_MODELS.has(payload.model)) {
      return NextResponse.json(
        { error: 'Unsupported model. Allowed: speech-2.8-turbo, speech-2.6-turbo, speech-02-turbo' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.minimax.io/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
