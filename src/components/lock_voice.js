const API_KEY = process.env.MINIMAX_API_KEY;
const GROUP_ID = process.env.MINIMAX_GROUP_ID;
const VOICE_ID = 'bac_si_phuc_custom';

async function lockVoice() {
    try {
        if (!API_KEY || !GROUP_ID) {
            throw new Error('Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID environment variables');
        }
        console.log('--- Locking Voice with a TTS request ---');
        const res = await fetch(`https://api.minimax.io/v1/t2a_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'x-group-id': GROUP_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "speech-2.8-turbo",
                text: "Chào bạn, tôi là Bác Sĩ Phúc. Giọng của tôi đã được kích hoạt thành công.",
                voice_setting: {
                    voice_id: VOICE_ID,
                    speed: 1,
                    vol: 1,
                    pitch: 0
                },
                audio_setting: {
                    format: "mp3"
                }
            })
        });

        const data = await res.json();
        console.log('TTS Result:', JSON.stringify(data.base_resp, null, 2));
        
        if (data.base_resp?.status_code === 0) {
            console.log('Voice is now ACTIVE and PERMANENT.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

lockVoice();
