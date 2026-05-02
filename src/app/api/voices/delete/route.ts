import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voice_id } = body;
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId || !voice_id) {
      return NextResponse.json({ error: 'Missing API Key, Group ID or Voice ID' }, { status: 400 });
    }

    let res = await fetch(`https://api.minimax.io/v1/delete_voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_type: 'voice_cloning',
        voice_id
      })
    });

    let data = await res.json();

    if (data.base_resp?.status_code !== 0) {
      res = await fetch(`https://api.minimax.io/v1/delete_voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-group-id': groupId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_type: 'voice_generation',
          voice_id
        })
      });
      data = await res.json();
    }

    if (data.base_resp?.status_code === 0 || data.base_resp?.status_msg?.includes('not exist')) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: data.base_resp?.status_msg || 'Delete failed' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
