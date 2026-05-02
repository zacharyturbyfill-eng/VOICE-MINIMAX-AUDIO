import { NextRequest } from 'next/server';

type CredentialInput = {
  apiKey?: string | null;
  groupId?: string | null;
};

export function resolveMiniMaxCredentials(
  req: NextRequest,
  input?: CredentialInput
) {
  const headerApiKey = req.headers.get('x-minimax-api-key')?.trim();
  const headerGroupId = req.headers.get('x-minimax-group-id')?.trim();
  const bodyApiKey = input?.apiKey?.trim();
  const bodyGroupId = input?.groupId?.trim();

  return {
    apiKey: bodyApiKey || headerApiKey || process.env.MINIMAX_API_KEY || '',
    groupId: bodyGroupId || headerGroupId || process.env.MINIMAX_GROUP_ID || '',
  };
}
