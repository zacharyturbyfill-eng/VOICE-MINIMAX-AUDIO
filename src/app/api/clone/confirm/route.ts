import { NextRequest, NextResponse } from 'next/server';
import { upsertStoredVoice } from '@/lib/voice-store';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const voice_name = (formData.get('voice_name') as string | null)?.trim();
    const gender = formData.get('gender') as string | null;
    const description = formData.get('description') as string | null;
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey || !groupId || !file || !voice_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Encode name into ID for persistence: "Bác Sĩ Phúc" -> "v_Bac_Si_Phuc_random"
    const slug = voice_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9]/g, '_')   // Replace special chars with _
      .replace(/_+/g, '_')             // Remove double underscores
      .replace(/^_|_$/g, '');          // Remove trailing underscores
    
    const random = Math.random().toString(36).substring(2, 8);
    const finalVoiceId = `v_${slug}_${random}`;

    console.log(`--- Confirming Voice Clone (Name-Encoded ID) ---`);
    console.log(`Voice Name: ${voice_name}, ID: ${finalVoiceId}`);

    // Step 1: Upload file for voice cloning
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('purpose', 'voice_clone');

    const uploadRes = await fetch(`https://api.minimax.io/v1/files/upload?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: uploadFormData,
    });

    const uploadData = await uploadRes.json();
    if (uploadData.base_resp?.status_code !== 0) {
      return NextResponse.json(
        { error: uploadData.base_resp?.status_msg || 'Upload failed' },
        { status: 500 }
      );
    }

    const fileId = uploadData.file?.file_id;
    if (!fileId) {
      return NextResponse.json({ error: 'Upload returned no file_id' }, { status: 500 });
    }

    // Step 2: Register the voice with language boost
    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: finalVoiceId,
        file_id: fileId,
        language_boost: 'Vietnamese'
      })
    });

    const cloneData = await cloneRes.json();
    console.log('Clone Response:', JSON.stringify(cloneData));

    if (cloneData.base_resp?.status_code !== 0) {
       return NextResponse.json({ 
         error: cloneData.base_resp?.status_msg || 'Cloning failed at MiniMax side',
         status_code: cloneData.base_resp?.status_code 
       }, { status: 500 });
    }
    
    await upsertStoredVoice({
      voice_id: finalVoiceId,
      voice_name,
      gender: gender ?? null,
      description: description ?? null,
    });

    return NextResponse.json({ 
      status_code: 0, 
      status_msg: 'success', 
      voice_id: finalVoiceId 
    });
  } catch (error: any) {
    console.error('Confirm API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
