import { NextRequest, NextResponse } from 'next/server';
import { resolveMiniMaxCredentials } from '@/lib/minimax-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, groupId } = resolveMiniMaxCredentials(req, body);

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 400 });
    }

    const payload = { ...body };
    delete payload.apiKey;
    delete payload.groupId;
    
    if (!payload.model) payload.model = 'speech-2.8-hd';

    const response = await fetch(`https://api.minimax.io/v1/t2a_async_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-group-id': groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('task_id');
    const fileId = searchParams.get('file_id');
    const action = searchParams.get('action');

    const { apiKey, groupId } = resolveMiniMaxCredentials(req);

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 400 });
    }

    if (action === 'query' && taskId) {
      const response = await fetch(`https://api.minimax.io/v1/query/t2a_async_query_v2?task_id=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-group-id': groupId,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      return NextResponse.json(result);
    } 
    
    if (action === 'download' && fileId) {
      const response = await fetch(`https://api.minimax.io/v1/files/retrieve_content?file_id=${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-group-id': groupId,
        },
      });
      
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to retrieve file' }, { status: response.status });
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        return NextResponse.json({ error: 'MiniMax Error: ' + JSON.stringify(errorData) }, { status: 400 });
      }

      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${fileId}.mp3"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
