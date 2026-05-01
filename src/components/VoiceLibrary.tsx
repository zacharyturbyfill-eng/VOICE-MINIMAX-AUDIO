"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Play, 
  Check, 
  Music, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Volume2, 
  Pause,
  ChevronRight,
  Download,
  Share2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Voice {
  voice_id: string;
  voice_name: string;
  is_cloned?: boolean;
  tags?: string[];
  description?: string;
  gender?: string;
}

interface VoiceLibraryProps {
  voices: Voice[];
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
  onPreview: (voiceId: string) => void;
  onClose: () => void;
  onDelete?: (voiceId: string) => void;
  onRename?: (voiceId: string, newName: string) => void;
}

export default function VoiceLibrary({ 
  voices, 
  selectedVoice, 
  onSelect, 
  onPreview, 
  onClose,
  onDelete,
  onRename
}: VoiceLibraryProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('My Voices');
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  const filteredVoices = voices.filter(v => {
    const name = (v.voice_name || v.voice_id).toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    
    if (activeTab === 'My Voices') return matchesSearch && v.is_cloned;
    if (activeTab === 'Library') return matchesSearch && !v.is_cloned;
    return matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
    >
      {/* Header Bar */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#0a0a0a]/50 backdrop-blur-xl">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
             </div>
             <h1 className="font-black text-xl tracking-tight text-white">VOICE LIBRARY</h1>
          </div>
          
          <nav className="flex gap-10">
            {['Library', 'My Voices', 'Collected Voices'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "h-20 text-sm font-bold transition-all relative",
                  activeTab === tab ? "text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <button 
          onClick={onClose}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col p-10 gap-8">
        {/* Search & Stats */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search library voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-3xl pl-16 pr-8 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Voice slots remaining</p>
                <div className="flex gap-1.5 mt-1.5">
                   {[1,2,3].map(i => (
                     <div key={i} className={cn("h-1 w-8 rounded-full", i <= 2 ? "bg-primary" : "bg-white/10")} />
                   ))}
                </div>
             </div>
             <button className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <Filter className="w-4 h-4" /> Filters
             </button>
          </div>
        </div>

        {/* Voice Grid/List */}
        <div className="flex-1 overflow-auto custom-scrollbar space-y-4 pr-4">
          <AnimatePresence mode="popLayout">
            {filteredVoices.map((voice) => (
              <motion.div 
                key={voice.voice_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative bg-[#151515] border border-white/5 rounded-[2.5rem] p-6 flex items-center gap-8 transition-all hover:border-primary/30",
                  selectedVoice === voice.voice_id && "ring-2 ring-primary border-transparent"
                )}
              >
                {/* Voice Icon */}
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                  <Volume2 className="w-8 h-8 text-primary" />
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-black text-white truncate">
                      {voice.voice_name || voice.voice_id}
                    </h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                        {voice.is_cloned ? 'Instant Clone' : 'System Voice'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-white/10">
                        HD
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl font-medium italic opacity-60">
                    {voice.description || "A clean, balanced and highly professional tone suitable for a wide range of creative applications."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 pr-4">
                  <button 
                    onClick={() => {
                      onPreview(voice.voice_id);
                      setPlayingVoice(voice.voice_id);
                    }}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      playingVoice === voice.voice_id 
                        ? "bg-white text-black scale-110" 
                        : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    {playingVoice === voice.voice_id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>

                  <button 
                    onClick={() => onSelect(voice.voice_id)}
                    className={cn(
                      "px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                      selectedVoice === voice.voice_id 
                        ? "bg-primary text-white shadow-xl shadow-primary/20" 
                        : "bg-white/5 text-white hover:bg-primary"
                    )}
                  >
                    {selectedVoice === voice.voice_id ? <><Check className="w-4 h-4 inline mr-2" /> Selected</> : "Use"}
                  </button>

                  <div className="relative">
                    <button 
                      onClick={() => setShowActions(showActions === voice.voice_id ? null : voice.voice_id)}
                      className="p-3 rounded-xl hover:bg-white/5 text-muted-foreground transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {showActions === voice.voice_id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowActions(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 z-20 overflow-hidden"
                          >
                            <button 
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-white hover:bg-white/5 transition-all"
                              onClick={() => {
                                const name = prompt('Enter new voice name:', voice.voice_name || voice.voice_id);
                                if (name && onRename) onRename(voice.voice_id, name);
                                setShowActions(null);
                              }}
                            >
                              <Edit3 className="w-4 h-4" /> Edit Name
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-white hover:bg-white/5 transition-all">
                              <Share2 className="w-4 h-4" /> Share Voice
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button 
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this voice?') && onDelete) {
                                  onDelete(voice.voice_id);
                                }
                                setShowActions(null);
                              }}
                            >
                              <Trash2 className="w-4 h-4" /> Delete Voice
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredVoices.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Music className="w-16 h-16 opacity-10" />
              <p className="font-bold text-sm uppercase tracking-widest">No voices found in this category.</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Player Bar */}
      <AnimatePresence>
        {playingVoice && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="h-24 bg-[#111111] border-t border-white/10 px-10 flex items-center gap-8 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20"
          >
            <div className="flex items-center gap-4 w-64 shrink-0">
               <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-white" />
               </div>
               <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {voices.find(v => v.voice_id === playingVoice)?.voice_name || "Unknown Voice"}
                  </p>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Previewing...</p>
               </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-muted-foreground">0:00</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative group">
                     <div className="absolute inset-y-0 left-0 w-1/3 bg-primary group-hover:bg-blue-500 transition-colors" />
                     <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">0:11</span>
               </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
               <button className="p-3 rounded-xl hover:bg-white/5 text-muted-foreground transition-all">
                  <Download className="w-5 h-5" />
               </button>
               <button 
                onClick={() => setPlayingVoice(null)}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-white/10"
               >
                 <Pause className="w-6 h-6 fill-current" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
