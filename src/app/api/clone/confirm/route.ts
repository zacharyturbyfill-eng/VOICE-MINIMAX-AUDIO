import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file_id, voice_name } = body;
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey || !groupId || !file_id || !voice_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slug = voice_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const random = Math.random().toString(36).substring(2, 8);
    const finalVoiceId = `v_${slug}_${random}`;

    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: finalVoiceId,
        file_id,
        language_boost: 'Vietnamese'
      })
    });

    const cloneData = await cloneRes.json();

    if (cloneData.base_resp?.status_code !== 0) {
      return NextResponse.json({
        error: cloneData.base_resp?.status_msg || 'Cloning failed at MiniMax side',
        status_code: cloneData.base_resp?.status_code
      }, { status: 500 });
    }

    await fetch(`https://api.minimax.io/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-2.8-turbo',
        text: `Giong cua ${voice_name} da duoc kich hoat thanh cong.`,
        voice_setting: { voice_id: finalVoiceId, speed: 1, vol: 1, pitch: 0 },
        audio_setting: { format: 'mp3' }
      })
    });

    return NextResponse.json({
      status_code: 0,
      status_msg: 'success',
      voice_id: finalVoiceId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
