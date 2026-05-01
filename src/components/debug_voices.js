const API_KEY = process.env.MINIMAX_API_KEY;
const GROUP_ID = process.env.MINIMAX_GROUP_ID;

async function debugVoices() {
    if (!API_KEY || !GROUP_ID) {
        throw new Error('Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID environment variables');
    }
    console.log('--- Debugging Voices API ---');
    console.log('URL: https://api.minimax.io/v1/get_voice?GroupId=' + GROUP_ID);
    
    try {
        const res = await fetch(`https://api.minimax.io/v1/get_voice?GroupId=${GROUP_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'all' })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Raw Response:', text);
        
        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response is not valid JSON');
        }

    } catch (error) {
        console.error('Fetch Error:', error.message);
    }
}

debugVoices();
