type StoredVoice = {
  voice_id: string;
  voice_name: string;
  file_id?: string | null;
  gender?: string | null;
  description?: string | null;
  created_at?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }
  return { url, serviceRoleKey };
}

export async function upsertStoredVoice(voice: StoredVoice) {
  const config = getSupabaseConfig();
  if (!config) return;

  await fetch(`${config.url}/rest/v1/stored_voices`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([voice]),
    cache: 'no-store',
  });
}

export async function listStoredVoices(): Promise<StoredVoice[]> {
  const config = getSupabaseConfig();
  if (!config) return [];

  const res = await fetch(
    `${config.url}/rest/v1/stored_voices?select=voice_id,voice_name,file_id,gender,description,created_at&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function deleteStoredVoice(voiceId: string) {
  const config = getSupabaseConfig();
  if (!config) return;

  await fetch(`${config.url}/rest/v1/stored_voices?voice_id=eq.${encodeURIComponent(voiceId)}`, {
    method: 'DELETE',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: 'no-store',
  });
}
