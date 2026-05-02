import { NextResponse } from 'next/server';
import crypto from 'crypto';

function mask(value: string) {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function fingerprint(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export async function GET() {
  const apiKeyRaw = process.env.MINIMAX_API_KEY ?? '';
  const groupIdRaw = process.env.MINIMAX_GROUP_ID ?? '';
  const apiKey = apiKeyRaw.trim();
  const groupId = groupIdRaw.trim();

  const hasApiKey = apiKey.length > 0;
  const hasGroupId = groupId.length > 0;

  const result: Record<string, unknown> = {
    ok: hasApiKey && hasGroupId,
    env: {
      hasApiKey,
      hasGroupId,
      apiKeyMasked: hasApiKey ? mask(apiKey) : null,
      apiKeyFingerprint: hasApiKey ? fingerprint(apiKey) : null,
      groupIdRaw,
      groupIdTrimmed: groupId,
      groupIdLength: groupId.length,
    },
  };

  if (!hasApiKey || !hasGroupId) {
    return NextResponse.json(result, { status: 500 });
  }

  try {
    const resp = await fetch(`https://api.minimax.io/v1/get_voice?GroupId=${groupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voice_type: 'system' }),
      cache: 'no-store',
    });

    const data = await resp.json();
    result.minimaxProbe = {
      httpStatus: resp.status,
      status_code: data?.base_resp?.status_code ?? null,
      status_msg: data?.base_resp?.status_msg ?? null,
    };
  } catch (error: any) {
    result.minimaxProbe = {
      error: error?.message ?? 'Unknown probe error',
    };
  }

  return NextResponse.json(result);
}
