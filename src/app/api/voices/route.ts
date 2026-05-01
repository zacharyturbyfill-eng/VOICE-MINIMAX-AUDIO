import { NextRequest, NextResponse } from 'next/server';

type VoiceItem = {
  voice_id: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    console.log(`--- Fetching All Possible Voice Types ---`);

    // Fetch multiple types to find the cloned voices
    const types = ['system', 'voice_cloning', 'voice_generation'];
    const results = await Promise.allSettled(
      types.map(type => 
        fetch(`https://api.minimax.io/v1/get_voice?GroupId=${groupId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voice_type: type }),
        }).then(res => res.json())
      )
    );

    const systemVoices: VoiceItem[] = [];
    const clonedVoices: VoiceItem[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        const type = types[index];
        console.log(`Type ${type}: Found ${data.system_voice?.length || 0} system, ${data.voice_cloning?.length || 0} cloning, ${data.voice_generation?.length || 0} generation voices.`);
        
        if (data.system_voice) systemVoices.push(...data.system_voice);
        if (data.voice_cloning) clonedVoices.push(...data.voice_cloning);
        if (data.voice_generation) clonedVoices.push(...data.voice_generation);
      }
    });

    // Final deduplication by voice_id
    const uniqueSystem = Array.from(new Map(systemVoices.map((v) => [v.voice_id, v])).values());
    const uniqueCloned = Array.from(new Map(clonedVoices.map((v) => [v.voice_id, v])).values());

    return NextResponse.json({
      system_voice: uniqueSystem,
      cloned_voice: uniqueCloned
    });
  } catch (error: any) {
    console.error('Voices API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
