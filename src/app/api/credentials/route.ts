import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type StoredCredential = {
  id: string;
  apiKey: string;
  groupId: string;
  note: string;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'minimax-credentials.json');

async function readCredentials(): Promise<StoredCredential[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCredentials(items: StoredCredential[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
}

export async function GET() {
  const items = await readCredentials();
  return NextResponse.json({ credentials: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = String(body.apiKey || '').trim();
    const groupId = String(body.groupId || '').trim();
    const note = String(body.note || '').trim();

    if (!apiKey || !groupId) {
      return NextResponse.json({ error: 'Missing apiKey or groupId' }, { status: 400 });
    }

    const items = await readCredentials();
    const nextItem: StoredCredential = {
      id: `cred_${Date.now()}`,
      apiKey,
      groupId,
      note,
      createdAt: new Date().toISOString(),
    };

    items.unshift(nextItem);
    await writeCredentials(items);
    return NextResponse.json({ credential: nextItem, credentials: items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const items = await readCredentials();
    const filtered = items.filter((item) => item.id !== id);
    await writeCredentials(filtered);
    return NextResponse.json({ credentials: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
