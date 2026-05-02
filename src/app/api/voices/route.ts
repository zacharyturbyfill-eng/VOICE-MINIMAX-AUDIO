import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId) {
      return NextResponse.json({ error: 'API Key or Group ID not configured' }, { status: 400 });
    }

    const response = await fetch(`https://api.minimax.io/v1/get_voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voice_type: 'all' }),
    });

    const data = await response.json();
    
    const systemVoices = data.system_voice || [];
    const clonedVoices = [
      ...(data.voice_cloning || []),
      ...(data.voice_generation || []),
      ...(data.cloned_voice || [])
    ];

    const uniqueSystem = Array.from(new Map(systemVoices.map((v: any) => [v.voice_id, v])).values());
    const uniqueCloned = Array.from(new Map(clonedVoices.map((v: any) => [v.voice_id, v])).values());

    return NextResponse.json({
      system_voice: uniqueSystem,
      cloned_voice: uniqueCloned
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
