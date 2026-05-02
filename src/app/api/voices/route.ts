import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId) {
      return NextResponse.json({ error: 'API Key or Group ID not configured' }, { status: 400 });
    }

    const types = ['system', 'voice_cloning', 'voice_generation'];
    const results = await Promise.allSettled(
      types.map(type =>
        fetch(`https://api.minimax.io/v1/get_voice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-group-id': groupId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voice_type: type }),
        }).then(res => res.json())
      )
    );

    const systemVoices: any[] = [];
    const clonedVoices: any[] = [];

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const data = result.value;
      if (data.system_voice) systemVoices.push(...data.system_voice);
      if (data.voice_cloning) clonedVoices.push(...data.voice_cloning);
      if (data.voice_generation) clonedVoices.push(...data.voice_generation);
    });

    const uniqueSystem = Array.from(new Map(systemVoices.map(v => [v.voice_id, v])).values());
    const uniqueCloned = Array.from(new Map(clonedVoices.map(v => [v.voice_id, v])).values());

    return NextResponse.json({
      system_voice: uniqueSystem,
      cloned_voice: uniqueCloned
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
