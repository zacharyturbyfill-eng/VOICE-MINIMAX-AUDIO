import { NextRequest, NextResponse } from 'next/server';
import { deleteStoredVoice } from '@/lib/voice-store';

export async function POST(req: NextRequest) {
  try {
    const { voice_id } = await req.json();
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey || !voice_id) {
      return NextResponse.json({ error: 'Missing API Key or Voice ID' }, { status: 400 });
    }

    // Try deleting as voice_cloning first
    let res = await fetch(`https://api.minimax.io/v1/delete_voice?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_type: 'voice_cloning',
        voice_id: voice_id
      })
    });

    let data = await res.json();
    
    // If it fails with "not exist", try as voice_generation
    if (data.base_resp?.status_code !== 0) {
      res = await fetch(`https://api.minimax.io/v1/delete_voice?GroupId=${groupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_type: 'voice_generation',
          voice_id: voice_id
        })
      });
      data = await res.json();
    }

    if (data.base_resp?.status_code === 0 || data.base_resp?.status_msg?.includes('not exist')) {
      await deleteStoredVoice(voice_id);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: data.base_resp?.status_msg || 'Delete failed' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
