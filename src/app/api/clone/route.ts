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
      if (rawUploadText.includes('Request Entity Too Large')) {
        return NextResponse.json({ error: 'File quá lớn. Vui lòng chọn file dưới 4MB.' }, { status: 413 });
      }
      return NextResponse.json({ error: 'Lỗi từ MiniMax API (Upload)', details: rawUploadText.substring(0, 100) }, { status: 500 });
    }

    if (uploadData.base_resp?.status_code !== 0) {
      return NextResponse.json({ error: uploadData.base_resp?.status_msg || 'Upload failed' }, { status: 500 });
    }

    const fileId = uploadData.file?.file_id;
    const slug = (voiceName || 'voice')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const voiceId = `v_${slug}_${Math.random().toString(36).substring(2, 7)}`;

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
      return NextResponse.json({ error: 'Lỗi từ MiniMax API (Clone)', details: rawCloneText.substring(0, 100) }, { status: 500 });
    }

    return NextResponse.json({ ...cloneData, voice_id: voiceId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
