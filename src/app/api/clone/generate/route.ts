import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const text = formData.get('text') as string;
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, {
      apiKey: formData.get('apiKey') as string,
      groupId: formData.get('groupId') as string,
    });

    if (!apiKey || !groupId || !file) {
      return NextResponse.json({ error: 'Missing API Key, Group ID or File' }, { status: 400 });
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('purpose', 'voice_clone');

    const uploadRes = await fetch(`https://api.minimax.io/v1/files/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId
      },
      body: uploadFormData
    });

    const uploadData = await uploadRes.json();
    if (uploadData.base_resp?.status_code !== 0) {
      return NextResponse.json({ error: uploadData.base_resp?.status_msg || 'Upload failed' }, { status: 500 });
    }

    const fileId = uploadData.file?.file_id;
    const tempVoiceId = 'temp_' + Date.now();
    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: tempVoiceId,
        file_id: fileId,
        language_boost: 'Vietnamese'
      })
    });

    const cloneData = await cloneRes.json();
    if (cloneData.base_resp?.status_code !== 0) {
      return NextResponse.json({ error: cloneData.base_resp?.status_msg || 'Cloning failed' }, { status: 500 });
    }

    const previewText = text || 'Xin chao, toi la giong noi vua duoc ban clone.';
    const ttsRes = await fetch(`https://api.minimax.io/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-2.8-turbo',
        text: previewText,
        voice_setting: {
          voice_id: tempVoiceId,
          speed: 1,
          vol: 1,
          pitch: 0
        },
        audio_setting: { format: 'mp3' }
      })
    });

    const ttsData = await ttsRes.json();

    fetch(`https://api.minimax.io/v1/delete_voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_type: 'voice_cloning',
        voice_id: tempVoiceId
      })
    }).catch(() => null);

    return NextResponse.json({
      audio: ttsData.data?.audio,
      file_id: fileId,
      temp_voice_id: tempVoiceId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
