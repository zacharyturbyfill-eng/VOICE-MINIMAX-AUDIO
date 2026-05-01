import { NextRequest, NextResponse } from 'next/server';
import { upsertStoredVoice } from '@/lib/voice-store';

export async function POST(req: NextRequest) {
  try {
    const { file_id, voice_name, gender, description } = await req.json();
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey || !file_id || !voice_name) {
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

    // Step 1: Register the voice with language boost
    const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: finalVoiceId,
        file_id: file_id,
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
    
    // Step 2: Immediate activation with a dummy TTS
    const ttsRes = await fetch(`https://api.minimax.io/v1/t2a_v2?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-2.8-turbo',
        text: `Giọng của ${voice_name} đã được kích hoạt thành công.`,
        voice_setting: { voice_id: finalVoiceId, speed: 1, vol: 1, pitch: 0 },
        audio_setting: { format: 'mp3' }
      })
    });

    const ttsData = await ttsRes.json();
    console.log('Activation TTS Response:', JSON.stringify(ttsData));

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
