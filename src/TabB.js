import React, { useEffect, useState } from 'react'; 
import useAppStore from './store'; 
import { Play, Copy, Check, Terminal, Activity, User, Settings, Save, Sparkles, Loader2, ShieldCheck } from 'lucide-react'; 
import { supabase } from './Auth'; // Importing the existing client from your Auth file

export default function TabB({ session }) {
  const { targetAudienceProfile, setTargetAudienceProfile, arenaAgentTurnState, setArenaAgentTurnState, finalGeneratedScript, setFinalGeneratedScript } = useAppStore(); 
  const apiBase = (
    process.env.REACT_APP_BACKEND_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')
  ).replace(/\/$/, '');
  const [tone, setTone] = useState('Professional'); 
  const [logs, setLogs] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [copied, setCopied] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); // New state for the save button
  const [triesLeft, setTriesLeft] = useState(3);

  useEffect(() => {
    const loadUsage = async () => {
      if (!session?.access_token) return;

      try {
        const res = await fetch(`${apiBase}/api/usage`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();

        if (typeof data.remainingUses === 'number') {
          setTriesLeft(data.remainingUses);
        }
      } catch (error) {
        console.error('Failed to load usage count:', error);
      }
    };

    loadUsage();
  }, [apiBase, session?.access_token]);

  const runSim = async () => { 
    if(!targetAudienceProfile) return alert('Please enter a target audience/topic first!'); 
    setIsProcessing(true); 
    setLogs(['[SYSTEM] Initializing Arena...', '[LOG] Verifying Credentials...']); 
    setArenaAgentTurnState(1); 
    
    try { 
      const res = await fetch(`${apiBase}/api/brainstorm`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          // Use optional chaining (?.) and a fallback empty string to prevent crashes
          'Authorization': `Bearer ${session?.access_token || ''}` 
        }, 
        body: JSON.stringify({ 
          userPrompt: targetAudienceProfile, 
          targetAudience: targetAudienceProfile, 
          derivedTrendContext: tone 
        }) 
      }); 
      
      const data = await res.json(); 
      
      if (!res.ok) {
        if (res.status === 429) {
          setTriesLeft(0);
        }

        throw new Error(data.detail || 'Backend connection failed.');
      }

      if (typeof data.remainingUses === 'number') {
        setTriesLeft(data.remainingUses);
      }

      setLogs(prev => [...prev, ...data.logs]); 
      setArenaAgentTurnState(2); 
      
      setTimeout(() => { 
        setArenaAgentTurnState(3); 
        setTimeout(() => { 
          setFinalGeneratedScript(data.finalScript); 
          setIsProcessing(false); 
          setArenaAgentTurnState(0); 
        }, 1500); 
      }, 1500); 
      
    } catch(err) { 
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]); 
      setIsProcessing(false); 
      setArenaAgentTurnState(0); 
    } 
  }; 

  const handleCopy = () => { 
    navigator.clipboard.writeText(finalGeneratedScript); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  }; 

  // --- NEW: Save Script to Database Function ---
  const saveScriptToDatabase = async () => {
    setIsSaving(true);
    try {
      // 1. Verify the user is currently logged in
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert("You must be logged in to save scripts!");
        setIsSaving(false);
        return;
      }

      // 2. Insert the data into the arena_scripts table
      const { error } = await supabase
        .from('arena_scripts')
        .insert([
          {
            user_id: user.id, // Securely links the script to this specific user
            target_audience: targetAudienceProfile,
            tone_context: tone,
            final_script: finalGeneratedScript
          }
        ]);

      if (error) throw error;
      
      alert("Script saved to your Supabase database successfully!");

    } catch (error) {
      console.error("Error saving script:", error.message);
      alert("Failed to save script: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const showProcessingSkeleton = isProcessing && !finalGeneratedScript;

  return (
    <div className='flex flex-col h-full text-white space-y-4 overflow-y-auto pb-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-end mb-2'>
        <div className='flex-1 relative'>
          <User className='absolute left-3 top-3 text-gray-400' size={18} />
          <input type='text' value={targetAudienceProfile} onChange={(e) => setTargetAudienceProfile(e.target.value)} placeholder='Who is this for? e.g. gym owners, students, gamers' className='w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[#00f3ff] transition' />
        </div>
        <div className='flex-1 relative'>
          <Settings className='absolute left-3 top-3 text-gray-400' size={18} />
          <select value={tone} onChange={(e) => setTone(e.target.value)} className='w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 appearance-none focus:outline-none focus:border-[#00f3ff] transition text-white'>
            <option>Professional</option>
            <option>Casual & Gen-Z</option>
            <option>Brainrot YouTube</option>
          </select>
        </div>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
          <button onClick={runSim} disabled={isProcessing} className={'px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition w-full sm:w-auto ' + (isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#00f3ff]/20 text-[#00f3ff] hover:bg-[#00f3ff]/40 border border-[#00f3ff]/50')}>
            {isProcessing ? <><Loader2 size={18} className='animate-spin' /> Working...</> : <><Play size={18} /> Run Arena</>}
          </button>

          <span className='px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-xs font-semibold text-gray-300 whitespace-nowrap flex items-center justify-center gap-2'>
            <ShieldCheck size={14} className={triesLeft > 0 ? 'text-emerald-400' : 'text-red-400'} />
            Tries left: {triesLeft}/3
          </span>
        </div>
      </div>
      
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[250px]'>
        <div className='bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col min-h-[250px]'>
          <h3 className='text-sm font-bold text-gray-400 mb-3 flex items-center gap-2'><Terminal size={16} /> Agent Dialogue</h3>
          <div className='flex-1 overflow-y-auto space-y-3'>
            <div className={'p-3 rounded border flex items-center gap-3 transition ' + (arenaAgentTurnState >= 1 ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.12)]' : 'border-white/5 text-gray-600')}>
              <span className={'flex h-9 w-9 items-center justify-center rounded-full border ' + (arenaAgentTurnState >= 1 ? 'border-blue-400/60 bg-blue-400/10 text-blue-200' : 'border-white/10 bg-white/5')}>
                <Sparkles size={16} className={arenaAgentTurnState >= 1 ? 'animate-pulse' : ''} />
              </span>
              <div>
                <div className='font-medium'>Agent 1</div>
                <div className='text-xs'>{arenaAgentTurnState >= 1 ? 'Drafting script skeleton...' : 'Waiting...'}</div>
              </div>
            </div>
            <div className={'p-3 rounded border flex items-center gap-3 transition ' + (arenaAgentTurnState >= 2 ? 'border-yellow-500/50 bg-yellow-500/10 text-white shadow-[0_0_20px_rgba(234,179,8,0.12)]' : 'border-white/5 text-gray-600')}>
              <span className={'flex h-9 w-9 items-center justify-center rounded-full border ' + (arenaAgentTurnState >= 2 ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200' : 'border-white/10 bg-white/5')}>
                <Activity size={16} className={arenaAgentTurnState >= 2 ? 'animate-pulse' : ''} />
              </span>
              <div>
                <div className='font-medium'>Agent 2</div>
                <div className='text-xs'>{arenaAgentTurnState >= 2 ? 'Cross-referencing facts...' : 'Waiting...'}</div>
              </div>
            </div>
            <div className={'p-3 rounded border flex items-center gap-3 transition ' + (arenaAgentTurnState >= 3 ? 'border-green-500/50 bg-green-500/10 text-white shadow-[0_0_20px_rgba(34,197,94,0.12)]' : 'border-white/5 text-gray-600')}>
              <span className={'flex h-9 w-9 items-center justify-center rounded-full border ' + (arenaAgentTurnState >= 3 ? 'border-green-400/60 bg-green-400/10 text-green-200' : 'border-white/10 bg-white/5')}>
                <ShieldCheck size={16} className={arenaAgentTurnState >= 3 ? 'animate-pulse' : ''} />
              </span>
              <div>
                <div className='font-medium'>Agent 3</div>
                <div className='text-xs'>{arenaAgentTurnState >= 3 ? 'Compiling final output...' : 'Waiting...'}</div>
              </div>
            </div>

            {showProcessingSkeleton && (
              <div className='space-y-2 pt-1'>
                <div className='h-3 w-5/6 rounded-full bg-white/10 animate-pulse' />
                <div className='h-3 w-4/6 rounded-full bg-white/10 animate-pulse' />
                <div className='h-3 w-3/6 rounded-full bg-white/10 animate-pulse' />
              </div>
            )}
          </div>
        </div>
        <div className='bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col min-h-[250px]'>
          <h3 className='text-sm font-bold text-gray-400 mb-3 flex items-center gap-2'><Activity size={16} /> Live System Logs</h3>
          <div className='flex-1 overflow-y-auto font-mono text-xs text-green-400 bg-black/80 p-3 rounded-xl border border-white/5'>
            {logs.map((log, i) => <div key={i}>{'>'} {log}</div>)}
            {isProcessing && <div className='animate-pulse'>{'>'} _</div>}
          </div>
        </div>
      </div>

      {showProcessingSkeleton && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='h-20 rounded-xl border border-white/10 bg-white/5 animate-pulse' />
          <div className='h-20 rounded-xl border border-white/10 bg-white/5 animate-pulse' />
          <div className='h-20 rounded-xl border border-white/10 bg-white/5 animate-pulse' />
        </div>
      )}
      
      {finalGeneratedScript && (
        <div className='bg-black/40 border border-[#00f3ff]/50 rounded-xl p-4 mt-4 relative group'>
          <button onClick={handleCopy} className='absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-md transition'>
            {copied ? <Check size={16} className='text-green-400' /> : <Copy size={16} />}
          </button>
          <h3 className='text-sm font-bold text-[#00f3ff] mb-2'>Final Generated Script</h3>
          <pre className='whitespace-pre-wrap font-sans text-sm text-gray-200'>{finalGeneratedScript}</pre>
          
          {/* NEW: Save to Database Button */}
          <div className='mt-6 flex justify-end'>
            <button 
              onClick={saveScriptToDatabase} 
              disabled={isSaving}
              className='px-4 py-2 bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50 rounded-lg hover:bg-[#00f3ff]/40 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Script to DB'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}