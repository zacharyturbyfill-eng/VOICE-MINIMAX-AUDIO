import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const text = formData.get('text') as string;
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey || !file) {
      return NextResponse.json({ error: 'Missing API Key or File' }, { status: 400 });
    }

    // Step 1: Upload file
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('purpose', 'voice_clone');

    const uploadRes = await fetch(`https://api.minimax.io/v1/files/upload?GroupId=${groupId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: uploadFormData
    });

    const uploadData = await uploadRes.json();
    if (uploadData.base_resp?.status_code !== 0) {
      return NextResponse.json({ error: uploadData.base_resp?.status_msg || 'Upload failed' }, { status: 500 });
    }

    const fileId = uploadData.file?.file_id;

    // Step 2: Create a temporary clone and get preview audio
    const tempVoiceId = 'temp_' + Date.now();
    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

    // Step 3: Generate the preview audio using the temp voice (In Vietnamese)
    const previewText = text || 'Xin chào, tôi là giọng nói vừa được bạn clone. Bạn thấy tôi nói tiếng Việt có hay không?';
    
    const ttsRes = await fetch(`https://api.minimax.io/v1/t2a_v2?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

    // Step 4: Cleanup - Delete the temporary voice immediately after generation
    fetch(`https://api.minimax.io/v1/delete_voice?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_type: 'voice_cloning',
        voice_id: tempVoiceId
      })
    }).catch(err => console.error('Temp voice cleanup failed', err));
    
    return NextResponse.json({ 
      audio: ttsData.data?.audio, 
      file_id: fileId,
      temp_voice_id: tempVoiceId 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
