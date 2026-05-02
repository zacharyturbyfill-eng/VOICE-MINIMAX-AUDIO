import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const voiceName = formData.get('voiceName') as string;
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

    const rawUploadText = await uploadRes.text();
    let uploadData;
    try {
      uploadData = JSON.parse(rawUploadText.split('\n')[0]);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse upload response', details: rawUploadText }, { status: 500 });
    }

    if (uploadData.base_resp?.status_code !== 0) {
      return NextResponse.json({ error: uploadData.base_resp?.status_msg || 'Upload failed' }, { status: 500 });
    }

    const fileId = uploadData.file?.file_id;
    const voiceId = (voiceName || 'voice').toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        file_id: fileId,
      })
    });

    const rawCloneText = await cloneRes.text();
    let cloneData;
    try {
      cloneData = JSON.parse(rawCloneText.split('\n')[0]);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse clone response', details: rawCloneText }, { status: 500 });
    }

    return NextResponse.json({ ...cloneData, voice_id: voiceId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
