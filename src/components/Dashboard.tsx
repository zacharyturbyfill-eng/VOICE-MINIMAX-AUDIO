"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Settings, 
  User, 
  Music, 
  Download, 
  Plus, 
  ChevronRight,
  Sparkles,
  Volume2,
  Mic2,
  FileAudio,
  Save,
  Trash2,
  Library,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Pause
} from 'lucide-react';
import VoiceLibrary from './VoiceLibrary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to encode name into ID: "Bác Sĩ Phúc" -> "v_Bac_Si_Phuc_random"
const encodeVoiceId = (name: string) => {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '_')   // Replace special chars with _
    .replace(/_+/g, '_')             // Remove double underscores
    .replace(/^_|_$/g, '');          // Remove trailing underscores
  
  const random = Math.random().toString(36).substring(2, 8);
  return `v_${slug}_${random}`;
};

// Helper to decode name from ID: "v_Bac_Si_Phuc_random" -> "Bac Si Phuc"
const decodeVoiceId = (id: string) => {
  if (!id.startsWith('v_')) return id;
  const parts = id.split('_');
  if (parts.length < 3) return id;
  // Remove first 'v' and last random suffix
  return parts.slice(1, -1).join(' ');
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const [script, setScript] = useState('Speaker A: Hello, this is a test of the MiniMax direct API.\nSpeaker B: It sounds amazing! (laughs)');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('calm');
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({
    'Speaker A': 'Chinese (Mandarin)_Reliable_Executive',
    'Speaker B': 'English (UK)_Grace_Executive'
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);

  // Cloning State
  const [cloneStep, setCloneStep] = useState(1); // 1: Upload + Register
  const [cloningFile, setCloningFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState('Xin chào, tôi là một giọng nói nhân tạo được tạo ra bởi MiniMax AI. Rất vui được đồng hành cùng bạn.');
  const [isCloning, setIsCloning] = useState(false);
  
  // Registration Form
  const [voiceName, setVoiceName] = useState('');
  const [voiceGender, setVoiceGender] = useState('male');
  const [voiceLanguageBoost, setVoiceLanguageBoost] = useState('Vietnamese');
  const [voiceDesc, setVoiceDesc] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [generatedChunks, setGeneratedChunks] = useState<any[]>([]);
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const sequenceAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleMergePreview = async () => {
    if (generatedChunks.length === 0) return;
    const blobs = await Promise.all(
      generatedChunks.filter(c => c.audio).map(async (c) => {
        const res = await fetch(c.audio);
        return await res.blob();
      })
    );
    const mergedBlob = new Blob(blobs, { type: 'audio/mpeg' });
    setMergedAudioUrl(URL.createObjectURL(mergedBlob));
  };

  const toggleGlobalPlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopSequence = () => {
    if (sequenceAudioRef.current) {
      sequenceAudioRef.current.pause();
    }
    setIsSequencePlaying(false);
    setIsPlaying(false);
    setActiveLineIndex(null);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchQuota = async () => {
    setQuotaLoading(true);
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();
      setQuotaInfo(data);
    } catch (err) {
      console.error('Failed to fetch quota');
    } finally {
      setQuotaLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
    fetchQuota();
  }, []);

  const fetchVoices = async () => {
    try {
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });
      const data = await res.json();
      
      const allVoices = [
        ...(data.cloned_voice || []).map((v: any) => ({ ...v, is_cloned: true })),
        ...(data.system_voice || []).map((v: any) => ({ ...v, is_cloned: false }))
      ].filter(v => !v.voice_id.startsWith('temp_'));
      
      // Merge with local voices to handle API delay
      const localVoices = JSON.parse(localStorage.getItem('minimax_local_voices') || '[]');
      console.log('Syncing with local voices:', localVoices.length);
      
      const mergedVoices = [...allVoices];
      
      localVoices.forEach((lv: any) => {
        const existingIdx = mergedVoices.findIndex(mv => mv.voice_id === lv.voice_id);
        if (existingIdx === -1) {
          // If it's a known local voice but not in API list yet, add it
          mergedVoices.unshift({ ...lv, is_cloned: true });
        } else {
          // ALWAYS overwrite the name from API (which is just the ID) with our local name
          if (lv.voice_name) {
            mergedVoices[existingIdx] = { 
              ...mergedVoices[existingIdx], 
              voice_name: lv.voice_name,
              is_cloned: true 
            };
          }
        }
      });

      // Final pass: if any cloned voice STILL has an ID as a name, try to decode it
      const finalVoices = mergedVoices.map(v => {
        if (v.is_cloned && (!v.voice_name || v.voice_name.startsWith('v_'))) {
          // Try local storage first
          const localMatch = localVoices.find((lv: any) => lv.voice_id === v.voice_id);
          if (localMatch?.voice_name) return { ...v, voice_name: localMatch.voice_name };
          
          // If not in local, decode from ID
          const decodedName = decodeVoiceId(v.voice_id);
          return { ...v, voice_name: decodedName };
        }
        return v;
      });
      
      setVoices(finalVoices);
      if (mergedVoices.length > 0 && !selectedVoice) {
        // Prefer cloned voice as default if available
        const firstClone = mergedVoices.find(v => v.is_cloned);
        setSelectedVoice(firstClone ? firstClone.voice_id : mergedVoices[0].voice_id);
      }
    } catch (err) {
      console.error('Failed to load voices');
    }
  };

  const parseScript = (text: string) => {
    const lines = text.split('\n');
    const chunks: { speaker: string, text: string }[] = [];
    let currentSpeaker = 'Speaker A';
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentSpeaker = match[1];
        chunks.push({ speaker: currentSpeaker, text: match[2] });
      } else if (line.trim()) {
        chunks.push({ speaker: currentSpeaker, text: line.trim() });
      }
    });
    return chunks;
  };

  const [usageChars, setUsageChars] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setLoading(true);
    setIsPlaying(true);
    setIsSequencePlaying(true);
    setUsageChars(null);
    setGeneratedChunks([]); // Reset
    
    try {
      const lines = parseScript(script);
      setGeneratedChunks(lines.map((l, i) => ({ ...l, id: i, status: 'generating' })));

      const results = await Promise.all(lines.map(async (line, index) => {
        // ... API fetch logic remains same
        const voiceId = roleMap[line.speaker] || selectedVoice;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'speech-2.8-turbo',
            text: line.text,
            voice_setting: { voice_id: voiceId, speed: speed, vol: 1, pitch: 0, emotion: selectedEmotion },
            audio_setting: { format: 'mp3' }
          })
        });
        const data = await res.json();
        const hex = data.data?.audio;
        let url = null;
        if (hex) {
          const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
          url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        }
        const result = { id: index, speaker: line.speaker, text: line.text, audio: url, usage: data.extra_info?.usage_characters, status: 'ready' as const };
        setGeneratedChunks(prev => prev.map(c => c.id === index ? result : c));
        return result;
      }));

      results.sort((a, b) => a.id - b.id);
      let totalUsage = 0;
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        totalUsage += result.usage || 0;
        setActiveLineIndex(i);
        
        const audioUrl = result.audio ?? undefined;
        if (audioUrl && isSequencePlaying) {
          await new Promise((resolve) => {
            const audio = new Audio(audioUrl);
            sequenceAudioRef.current = audio;
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play();
          });
        }
        if (!isSequencePlaying) break;
      }
      
      setUsageChars(totalUsage);
      handleMergePreview();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setIsPlaying(false);
      setIsSequencePlaying(false);
      setActiveLineIndex(null);
    }
  };

  const handlePreviewVoice = async (voiceId: string) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'speech-2.8-turbo',
          text: 'Hello, this is a voice preview.',
          voice_setting: {
            voice_id: voiceId,
            speed: 1,
            vol: 1,
            pitch: 0
          },
          audio_setting: { format: 'mp3' }
        })
      });
      const data = await res.json();
      if (data.base_resp?.status_code !== 0) {
        alert(`Synthesis failed: ${data.base_resp?.status_msg || 'Unknown error'}`);
        return;
      }
      if (data.data?.audio) {
        const hex = data.data.audio;
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error('Preview failed', err);
    }
  };

  const handleInitialGenerateClone = async () => {
    if (!cloningFile) {
      alert('Please upload a file.');
      return;
    }
    setShowRegisterModal(true);
  };

  const handleSaveVoice = async () => {
    if (!voiceName.trim() || !cloningFile) {
      alert('Please provide a voice name.');
      return;
    }
    setIsCloning(true);
    try {
      const res = await fetch('/api/clone/confirm', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', cloningFile);
            formData.append('voice_name', voiceName);
            formData.append('gender', voiceGender);
            formData.append('language_boost', voiceLanguageBoost);
            formData.append('description', voiceDesc);
            return formData;
          })()
      });
      const data = await res.json();
      
      if (data.status_code === 0) {
        // Save to local storage to handle API delay
        const localVoices = JSON.parse(localStorage.getItem('minimax_local_voices') || '[]');
        localVoices.push({
          voice_id: data.voice_id,
          voice_name: voiceName,
          is_cloned: true,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('minimax_local_voices', JSON.stringify(localVoices));

        alert('Voice saved successfully!');
        setShowRegisterModal(false);
        setCloneStep(1);
        setCloningFile(null);
        fetchVoices();
        setActiveTab('editor');
      } else {
        throw new Error(data.status_msg || 'Saving failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    try {
      const res = await fetch('/api/voices/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId })
      });
      const data = await res.json();
      
      if (data.success || data.error?.includes('not exist') || data.error?.includes('not found')) {
        // Remove from local storage
        const localVoices = JSON.parse(localStorage.getItem('minimax_local_voices') || '[]');
        const updatedLocal = localVoices.filter((v: any) => v.voice_id !== voiceId);
        localStorage.setItem('minimax_local_voices', JSON.stringify(updatedLocal));
        
        // Update state
        setVoices(prev => prev.filter(v => v.voice_id !== voiceId));
        if (selectedVoice === voiceId) setSelectedVoice(voices[0]?.voice_id || '');
        alert('Voice deleted successfully!');
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleRenameVoice = (voiceId: string, newName: string) => {
    // Update local storage
    const localVoices = JSON.parse(localStorage.getItem('minimax_local_voices') || '[]');
    const existingIndex = localVoices.findIndex((v: any) => v.voice_id === voiceId);
    
    if (existingIndex > -1) {
      localVoices[existingIndex].voice_name = newName;
    } else {
      localVoices.push({
        voice_id: voiceId,
        voice_name: newName,
        is_cloned: true
      });
    }
    localStorage.setItem('minimax_local_voices', JSON.stringify(localVoices));
    
    // Update state
    setVoices(prev => prev.map(v => v.voice_id === voiceId ? { ...v, voice_name: newName } : v));
    alert('Voice renamed locally!');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#111111]/80 backdrop-blur-3xl flex flex-col z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-black text-xl tracking-tighter text-white">MINIMAX</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem 
            icon={<Music className="w-5 h-5" />} 
            label="TTS Editor" 
            active={activeTab === 'editor'} 
            onClick={() => setActiveTab('editor')}
          />
          <SidebarItem 
            icon={<Mic2 className="w-5 h-5" />} 
            label="Voice Cloning" 
            active={activeTab === 'cloning'} 
            onClick={() => setActiveTab('cloning')}
          />
          <SidebarItem 
            icon={<FileAudio className="w-5 h-5" />} 
            label="My Files" 
            active={activeTab === 'files'} 
            onClick={() => setActiveTab('files')}
          />
        </nav>

        <div className="p-6">
          <div className="bg-white/5 rounded-[2rem] p-5 space-y-4 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Account</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                   {quotaInfo?.base_resp?.status_code === 0 ? 'Token Plan' : 'Standard'}
                </p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Credits Left</span>
                <span className="text-primary">{quotaInfo?.data?.total_remains?.toLocaleString() || 0}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  className="h-full bg-gradient-to-r from-primary to-blue-500"
                />
              </div>
            </div>

            <button 
              onClick={fetchQuota}
              disabled={quotaLoading}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-95"
            >
              {quotaLoading ? 'Syncing...' : 'Refresh Balance'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#0a0a0a]/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-6">
            <h2 className="font-bold text-2xl tracking-tight text-white">
              {activeTab === 'editor' ? 'TTS Studio' : activeTab === 'cloning' ? 'Professional Voice Cloning' : 'Media Library'}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">API Online</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                <Settings className="w-5 h-5 text-muted-foreground" />
             </button>
             <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                <Save className="w-4 h-4" /> Save Project
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'editor' ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-auto p-10 flex gap-10"
            >
              <section className="flex-1 flex flex-col gap-8">
                <div className="flex-1 bg-[#151515] rounded-[3rem] p-10 shadow-inner border border-white/5 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="w-full h-full bg-transparent resize-none border-none outline-none font-medium text-xl leading-relaxed placeholder:text-white/10 text-white/90"
                    placeholder="Enter dialogue like 'Speaker A: Hello...'"
                  />
                  
                  <div className="absolute top-10 right-10 flex flex-col items-end gap-3 pointer-events-none">
                     <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
                        <span className="text-xs font-bold tracking-widest text-muted-foreground">
                          {script.length.toLocaleString()} / 10,000 CHARS
                        </span>
                     </div>
                     {usageChars !== null && (
                       <motion.div 
                         initial={{ x: 20, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         className="bg-primary/20 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-2xl"
                       >
                          <span className="text-xs font-bold tracking-widest text-primary">
                            - {usageChars} TOKENS
                          </span>
                       </motion.div>
                     )}
                  </div>

                  <div className="absolute bottom-10 right-10 flex gap-4">
                    {audioUrl && (
                      <button 
                        onClick={() => new Audio(audioUrl).play()}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 active:scale-95 transition-all backdrop-blur-md"
                      >
                        <Volume2 className="w-5 h-5" /> Replay
                      </button>
                    )}
                    <button 
                      onClick={handleGenerate}
                      disabled={loading}
                      className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Synthesizing...' : <><Play className="w-5 h-5 fill-current" /> Generate Speech</>}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-[#151515] rounded-[2.5rem] p-8 border border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-primary" /> Emotional Cues
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {['(laughs)', '(sighs)', '(coughs)', '(breath)', '(groans)', '(chuckle)', '(sneezes)', '(crying)', '(applause)'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setScript(s => s + " " + tag)}
                          className="px-4 py-2 rounded-xl bg-white/5 text-[11px] font-bold text-white/70 hover:bg-primary/20 hover:text-primary border border-white/5 transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#151515] rounded-[2.5rem] p-8 border border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-3">
                      <User className="w-4 h-4 text-primary" /> Cast Roles
                    </h3>
                    <div className="space-y-3">
                      {Array.from(new Set(parseScript(script).map(l => l.speaker))).map(speaker => (
                        <div key={speaker} className="relative">
                          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground w-20 truncate">{speaker}</span>
                            <button 
                              onClick={() => setOpenDropdown(openDropdown === speaker ? null : speaker)}
                              className="flex-1 flex items-center justify-between bg-transparent border-none text-[11px] font-bold text-white outline-none text-left"
                            >
                              <span className="truncate">
                                {voices.find(v => v.voice_id === (roleMap[speaker] || selectedVoice))?.voice_name || (roleMap[speaker] || selectedVoice)}
                              </span>
                              <ChevronDown className={cn("w-3 h-3 transition-transform", openDropdown === speaker && "rotate-180")} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {openDropdown === speaker && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute left-0 right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-2"
                                >
                                  <div className="px-4 py-2 mb-1">
                                     <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">My Cloned Voices</p>
                                  </div>
                                  {voices.filter(v => v.is_cloned).map((v: any) => (
                                    <button 
                                      key={v.voice_id}
                                      onClick={() => {
                                        setRoleMap(prev => ({ ...prev, [speaker]: v.voice_id }));
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/20 transition-all text-left group"
                                    >
                                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Mic2 className="w-3 h-3" />
                                      </div>
                                      <span className="text-[11px] font-bold text-white">{v.voice_name || v.voice_id}</span>
                                      {(roleMap[speaker] || selectedVoice) === v.voice_id && <Check className="w-3 h-3 ml-auto text-primary" />}
                                    </button>
                                  ))}
                                  {voices.filter(v => v.is_cloned).length === 0 && (
                                    <div className="px-4 py-3 text-[10px] text-muted-foreground italic">No cloned voices yet</div>
                                  )}
                                  <div className="h-px bg-white/5 my-2" />
                                  <button 
                                    onClick={() => {
                                      setShowVoiceLibrary(true);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left text-primary"
                                  >
                                    <Library className="w-3 h-3" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Browse Full Library</span>
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Generated Result Chunks */}
                <AnimatePresence>
                  {generatedChunks.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between px-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                          <Music className="w-4 h-4" /> Final Audio Chunks
                        </h3>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{generatedChunks.length} segments</span>
                           <button 
                             onClick={handleMergePreview}
                             className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/20 transition-all"
                           >
                              <Sparkles className="w-3 h-3" /> Merge Vertical
                           </button>
                           <button 
                              onClick={() => {
                                if (mergedAudioUrl) {
                                  const a = document.createElement('a');
                                  a.href = mergedAudioUrl;
                                  a.download = `conversation_${Date.now()}.mp3`;
                                  a.click();
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest border border-white/10 transition-all"
                           >
                              <Download className="w-3 h-3" /> Download Full
                           </button>
                        </div>
                      </div>

                      {/* Merged Player Section */}
                      {mergedAudioUrl && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mx-6 p-6 bg-gradient-to-r from-primary/20 to-blue-600/20 border border-primary/30 rounded-[2.5rem] flex items-center gap-6"
                        >
                          <button 
                            onClick={toggleGlobalPlayback}
                            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:scale-110 active:scale-95 transition-all"
                          >
                            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                          </button>
                          <div className="flex-1">
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Master Merged Track</p>
                             <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  animate={isPlaying ? { x: ["-100%", "100%"] } : { x: "0%" }}
                                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
                                />
                             </div>
                          </div>
                          <audio 
                            ref={audioRef} 
                            src={mergedAudioUrl} 
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                          />
                        </motion.div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        {generatedChunks.map((chunk, idx) => (
                          <motion.div 
                            key={chunk.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={cn(
                              "bg-[#151515] border rounded-3xl p-6 flex items-center gap-6 transition-all",
                              activeLineIndex === idx ? "border-primary ring-1 ring-primary/50 shadow-lg shadow-primary/10" : "border-white/5"
                            )}
                          >
                            <button 
                              disabled={chunk.status !== 'ready'}
                              onClick={() => {
                                if (activeLineIndex === idx) {
                                  stopSequence();
                                } else if (chunk.audio) {
                                  new Audio(chunk.audio).play();
                                }
                              }}
                              className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                chunk.status === 'ready' 
                                  ? "bg-primary/20 text-primary hover:bg-primary hover:text-white" 
                                  : "bg-white/5 text-muted-foreground animate-pulse"
                              )}
                            >
                              {chunk.status !== 'ready' ? (
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              ) : activeLineIndex === idx ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-3 mb-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{chunk.speaker}</span>
                                  {chunk.status === 'ready' && (
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                      • {chunk.usage} tokens
                                    </span>
                                  )}
                               </div>
                               <p className="text-sm font-medium text-white/80 truncate">{chunk.text}</p>
                            </div>

                            {activeLineIndex === idx && (
                              <div className="flex gap-1 items-center px-4">
                                {[1,2,3].map(i => (
                                  <motion.div 
                                    key={i}
                                    animate={{ height: [4, 16, 4] }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                    className="w-1 bg-primary rounded-full"
                                  />
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <aside className="w-96 flex flex-col gap-8">
                <div className="flex-1 bg-[#151515] rounded-[3rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-sm uppercase tracking-widest text-white">Voice Library</h3>
                      <button 
                        onClick={() => setShowVoiceLibrary(true)}
                        className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20"
                      >
                        <Library className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search voices..." 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-white/10"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-2">
                    {voices.filter(v => v.is_cloned).map((voice: any) => (
                      <button 
                        key={voice.voice_id}
                        onClick={() => setSelectedVoice(voice.voice_id)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl transition-all group flex items-center justify-between border border-transparent",
                          selectedVoice === voice.voice_id 
                            ? "bg-primary/10 border-primary/20" 
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className={cn(
                            "text-sm font-bold transition-colors truncate",
                            selectedVoice === voice.voice_id ? "text-primary" : "text-white/80 group-hover:text-primary"
                          )}>
                            {voice.voice_name || voice.voice_id}
                          </p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                             {voice.is_cloned ? 'Clone' : 'System'} • HD
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-all",
                          selectedVoice === voice.voice_id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                        )} />
                      </button>
                    ))}
                    {voices.filter(v => v.is_cloned).length === 0 && (
                      <div className="py-10 text-center px-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-relaxed">
                          No cloned voices available.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </motion.div>
          ) : activeTab === 'cloning' ? (
            <motion.div 
              key="cloning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 p-12 max-w-5xl mx-auto w-full"
            >
              <div className="bg-[#151515] rounded-[4rem] p-16 shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
                  <Mic2 className="w-96 h-96" />
                </div>
                
                <div className="flex flex-col md:flex-row gap-16 relative">
                  {/* Left Column: Flow */}
                  <div className="flex-1 space-y-10">
                    <div className="space-y-4">
                      <h2 className="text-5xl font-black tracking-tighter text-white">Voice Cloning</h2>
                      <p className="text-muted-foreground text-lg font-medium">Create a digital twin of any voice in 3 simple steps.</p>
                    </div>

                    <div className="space-y-12">
                      {/* Step 1: Upload */}
                      <div className={cn("space-y-6 transition-opacity", cloneStep !== 1 && "opacity-40 pointer-events-none")}>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm">1</div>
                           <h3 className="text-xl font-bold text-white">Import Audio Sample</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={(e) => setCloningFile(e.target.files?.[0] || null)}
                            className="hidden" 
                            accept="audio/*"
                          />
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer bg-black/20",
                              cloningFile ? "border-primary/50 bg-primary/5" : "border-white/10 hover:border-primary/50"
                            )}
                          >
                            <Plus className={cn("w-10 h-10", cloningFile ? "text-primary" : "text-muted-foreground")} />
                            <p className="text-xs font-bold uppercase tracking-widest text-center">
                              {cloningFile ? cloningFile.name : "Add or drop file"}
                            </p>
                          </div>
                          <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 bg-black/20 opacity-50 cursor-not-allowed">
                            <Mic2 className="w-10 h-10 text-muted-foreground" />
                            <p className="text-xs font-bold uppercase tracking-widest text-center">Record audio</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Text to Preview</label>
                          <textarea 
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-sm min-h-[120px]"
                            placeholder="Enter text to generate a preview of the cloned voice..."
                          />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                          <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                          <p className="text-[10px] text-primary font-bold leading-tight uppercase tracking-wider">
                            By generating, you confirm you have legal rights to use this voice.
                          </p>
                        </div>

                        <button 
                          onClick={handleInitialGenerateClone}
                          disabled={isCloning || !cloningFile}
                          className="w-full py-6 rounded-[2rem] bg-primary text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isCloning ? "Processing..." : "Create Voice"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tips */}
                  <div className="w-80 hidden lg:block space-y-8">
                    <div className="bg-white/5 border border-white/5 rounded-[3rem] p-10 space-y-8">
                       <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Pro Tips</h4>
                       <div className="space-y-8">
                          <TipItem 
                            title="Noise Free" 
                            desc="Record in a quiet room with minimal echo for the best results." 
                          />
                          <TipItem 
                            title="Length" 
                            desc="A 30-60 second clip is the sweet spot for natural cloning." 
                          />
                          <TipItem 
                            title="Emotion" 
                            desc="Speak in a neutral, clear tone to allow the AI maximum flexibility." 
                          />
                       </div>
                    </div>
                    
                    <div className="px-6 space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Voice slots remaining</p>
                       <div className="flex gap-2">
                          {[1,2,3].map(i => (
                            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= 2 ? "bg-primary" : "bg-white/10")} />
                          ))}
                       </div>
                       <p className="text-[10px] font-bold text-primary text-right">2 / 3</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-6">
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10 opacity-20">
                <FileAudio className="w-12 h-12" />
              </div>
              <p className="font-bold uppercase tracking-widest text-xs">No media files generated yet.</p>
            </div>
          )}
        </AnimatePresence>

        {/* Voice Library Modal */}
        <AnimatePresence>
          {showVoiceLibrary && (
            <VoiceLibrary 
              voices={voices}
              selectedVoice={selectedVoice}
              onSelect={(id) => {
                setSelectedVoice(id);
                setShowVoiceLibrary(false);
              }}
              onPreview={handlePreviewVoice}
              onDelete={handleDeleteVoice}
              onRename={handleRenameVoice}
              onClose={() => setShowVoiceLibrary(false)}
            />
          )}
        </AnimatePresence>

        {/* Registration Modal */}
        <AnimatePresence>
          {showRegisterModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-xl bg-[#1a1a1a] border border-white/10 rounded-[3rem] p-12 shadow-2xl space-y-10"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black tracking-tighter text-white">Voice Registration</h2>
                  <button onClick={() => setShowRegisterModal(false)}>
                    <X className="w-8 h-8 text-muted-foreground hover:text-white transition-colors" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Voice Name</label>
                    <input 
                      type="text" 
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="e.g. Dr. Phuc Premium"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Label</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none">
                        <option>Vietnamese</option>
                        <option>English</option>
                        <option>Chinese</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Language Boost</label>
                      <select
                        value={voiceLanguageBoost}
                        onChange={(e) => setVoiceLanguageBoost(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
                      >
                        <option value="Vietnamese">Vietnamese</option>
                        <option value="English">English</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Korean">Korean</option>
                        <option value="Thai">Thai</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gender</label>
                      <select 
                        value={voiceGender}
                        onChange={(e) => setVoiceGender(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</label>
                    <textarea 
                      value={voiceDesc}
                      onChange={(e) => setVoiceDesc(e.target.value)}
                      placeholder="Clear and professional medical tone..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    onClick={() => setShowRegisterModal(false)}
                    className="flex-1 py-5 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                   >
                     Back
                   </button>
                   <button 
                    onClick={handleSaveVoice}
                    disabled={isCloning}
                    className="flex-[2] py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     {isCloning ? 'Saving...' : 'Save Voice'}
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Master Control Bar */}
      <AnimatePresence>
        {(generatedChunks.length > 0 || loading) && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4"
          >
            <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 flex items-center gap-6 shadow-2xl">
               <button 
                 onClick={loading || isSequencePlaying ? stopSequence : toggleGlobalPlayback}
                 className="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
               >
                 {loading || isSequencePlaying ? <Pause className="w-7 h-7 fill-current" /> : isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
               </button>

               <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {loading ? 'Generating Conversation...' : isSequencePlaying ? 'Auto-playing Sequence...' : 'Master Controls'}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {generatedChunks.filter(c => c.status === 'ready').length} / {generatedChunks.length} Ready
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(generatedChunks.filter(c => c.status === 'ready').length / generatedChunks.length) * 100}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button 
                    onClick={handleMergePreview}
                    className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-primary" /> Merge
                  </button>
                  <button 
                    onClick={() => {
                      if (mergedAudioUrl) {
                        const a = document.createElement('a');
                        a.href = mergedAudioUrl;
                        a.download = `conversation.mp3`;
                        a.click();
                      }
                    }}
                    disabled={!mergedAudioUrl}
                    className="px-6 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    Download
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-500 group",
        active 
          ? "bg-primary text-white shadow-2xl shadow-primary/40 scale-[1.05]" 
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-500", active && "scale-110")}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active-indicator"
          className="ml-auto w-1.5 h-6 rounded-full bg-white"
        />
      )}
    </button>
  );
}

function TipItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-2">
       <h5 className="text-[11px] font-black uppercase tracking-widest text-white/90">{title}</h5>
       <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">{desc}</p>
    </div>
  );
}
