const API_KEY = process.env.MINIMAX_API_KEY;
const GROUP_ID = process.env.MINIMAX_GROUP_ID;
const FILE_ID = 393440795537646; // The numeric ID from Step 1
const VOICE_NAME = 'Bác Sĩ Phúc';
const VOICE_ID = 'bac_si_phuc_custom'; // Unique identifier

async function cloneVoice() {
    try {
        if (!API_KEY || !GROUP_ID) {
            throw new Error('Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID environment variables');
        }
        console.log('\n--- Step 2: Creating Cloned Voice (Using /v1/voice_clone) ---');
        const cloneRes = await fetch(`https://api.minimax.io/v1/voice_clone?GroupId=${GROUP_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                voice_id: VOICE_ID,
                file_id: FILE_ID
            })
        });

        const rawText = await cloneRes.text();
        console.log('Raw Clone Response:', rawText);

        let cloneData;
        try {
            cloneData = JSON.parse(rawText.split('\n')[0]);
        } catch (e) {
            console.error('Failed to parse response.');
            return;
        }

        if (cloneData.base_resp?.status_code === 0) {
            console.log('\nSUCCESS! Voice "Bác Sĩ Phúc" has been created.');
            console.log('Use Voice ID:', VOICE_ID, 'in your TTS requests.');
        } else {
            console.error('\nFAILED:', cloneData.base_resp?.status_msg);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

cloneVoice();
