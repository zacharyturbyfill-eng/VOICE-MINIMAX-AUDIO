const API_KEY = 'sk-api-QtsTwq97qZdH1EsDNn2I7X6F7AimJa6LsU-lMeIAv9c6H3gJZQYA3wHG9hSd2QSGL-192NI1RoZz0-111jrmtG5UrOo2dqi1XoRyNh2OLi1_5V_2KZaYxEY';
const GROUP_ID = '2025813060312117262';

async function debugVoices() {
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
