const API_KEY = process.env.MINIMAX_API_KEY;
const GROUP_ID = process.env.MINIMAX_GROUP_ID;

async function superScan() {
    if (!API_KEY || !GROUP_ID) {
        throw new Error('Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID environment variables');
    }
    console.log('--- Super Scanning for Cloned Voices ---');
    try {
        const res = await fetch(`https://api.minimax.io/v1/get_voice?GroupId=${GROUP_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ voice_type: 'all' })
        });

        const data = await res.json();
        console.log('Full JSON Response Keys:', Object.keys(data));
        
        // Search for our cloned voice in the entire object
        const jsonString = JSON.stringify(data);
        if (jsonString.includes('bac_si_phuc') || jsonString.includes('Bác Sĩ Phúc')) {
            console.log('FOUND IT! The voice exists in the response.');
            // Find which key it belongs to
            for (const key in data) {
                if (Array.isArray(data[key])) {
                    const match = data[key].find(v => v.voice_id?.includes('bac_si_phuc') || v.voice_name?.includes('Bác Sĩ Phúc'));
                    if (match) {
                        console.log(`It is under the key: "${key}"`);
                        console.log('Voice Object:', JSON.stringify(match, null, 2));
                    }
                }
            }
        } else {
            console.log('Voice not found in the "all" response. Trying "voice_cloning" specifically...');
            const res2 = await fetch(`https://api.minimax.io/v1/get_voice?GroupId=${GROUP_ID}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ voice_type: 'voice_cloning' })
            });
            const data2 = await res2.json();
            console.log('voice_cloning response:', JSON.stringify(data2, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

superScan();
