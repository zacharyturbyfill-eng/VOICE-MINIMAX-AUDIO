export interface MiniMaxVoiceSetting {
  voice_id: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: string;
}

export interface MiniMaxAudioSetting {
  sample_rate?: number;
  bitrate?: number;
  format?: 'mp3' | 'pcm' | 'flac' | 'wav';
  channel?: 1 | 2;
}

export interface MiniMaxT2AReq {
  model: string;
  text: string;
  stream?: boolean;
  voice_setting: MiniMaxVoiceSetting;
  audio_setting?: MiniMaxAudioSetting;
  output_format?: 'url' | 'hex';
  language_boost?: string;
}

export interface MiniMaxT2AResp {
  data: {
    audio: string;
    status: number;
    subtitle_file?: string;
  };
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  trace_id: string;
}

export class MiniMaxClient {
  private apiKey: string;
  private groupId: string;
  private baseUrl = 'https://api.minimax.io/v1';

  constructor(apiKey: string, groupId: string) {
    this.apiKey = apiKey;
    this.groupId = groupId;
  }

  async t2a(payload: MiniMaxT2AReq): Promise<MiniMaxT2AResp> {
    const response = await fetch(`${this.baseUrl}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-group-id': this.groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        output_format: payload.output_format || 'hex',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.base_resp?.status_msg || 'Failed to call MiniMax API');
    }

    return response.json();
  }

  async getVoices(type: 'system' | 'voice_cloning' | 'voice_generation' | 'all' = 'all') {
    const response = await fetch(`${this.baseUrl}/get_voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-group-id': this.groupId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voice_type: type }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    return response.json();
  }
}
