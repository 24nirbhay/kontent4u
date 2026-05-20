import React, { useMemo, useState } from 'react';
import { FileText, Link2, Languages, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';

export default function TabC({ session }) {
  const apiBase = (
    process.env.REACT_APP_BACKEND_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')
  ).replace(/\/$/, '');

  const [videoUrl, setVideoUrl] = useState('');
  const [lang, setLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Paste a YouTube, TikTok, Instagram, X, Facebook, or file URL.');
  const [transcript, setTranscript] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);

  const transcriptText = useMemo(() => {
    if (!transcript) return '';

    const rawText = transcript?.text || transcript?.content?.map((part) => part.text).join(' ') || '';
    if (!rawText) return '';

    if (!isMarkdown) return rawText;

    const sentences = rawText
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length <= 1) return `# Transcript\n\n${rawText}`;

    const headline = sentences[0].replace(/[.!?]+$/, '');
    const body = sentences.slice(1).map((sentence) => `- ${sentence}`).join('\n');

    return `# Transcript\n\n## Key Points\n\n- ${headline}\n${body ? `\n${body}` : ''}`.trim();
  }, [transcript, isMarkdown]);

  const copyTranscript = async () => {
    const text = transcriptText;

    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const fetchTranscript = async () => {
    if (!videoUrl.trim()) {
      setStatus('Add a video URL first.');
      return;
    }

    setIsLoading(true);
    setStatus('Fetching transcript...');
    setTranscript(null);

    try {
      const res = await fetch(`${apiBase}/api/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          url: videoUrl.trim(),
          lang,
          text: true,
          mode: 'auto',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Transcript request failed.');
      }

      if (data.jobId) {
        setStatus('Transcript job queued. Checking for results...');

        const jobData = await pollTranscriptJob(data.jobId);
        setTranscript(jobData);
        setStatus(jobData?.status === 'completed' ? 'Transcript ready.' : 'Transcript job finished.');
      } else {
        setTranscript(data);
        setStatus('Transcript ready.');
      }
    } catch (error) {
      setStatus(error.message || 'Unable to fetch transcript right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const pollTranscriptJob = async (jobId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await fetch(`${apiBase}/api/transcript?jobId=${encodeURIComponent(jobId)}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Transcript job lookup failed.');
      }

      if (data.status === 'completed' || data.content) {
        return data;
      }

      if (data.status === 'failed') {
        throw new Error(data.error?.message || 'Transcript job failed.');
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    throw new Error('Transcript is still processing. Try again in a moment.');
  };

  return (
    <div className='flex flex-col h-full text-white space-y-4 overflow-y-auto pb-4'>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-end'>
        <div className='flex-1 relative'>
          <Link2 className='absolute left-3 top-3 text-gray-400' size={18} />
          <input
            type='url'
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder='Paste a video link here'
            className='w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#00f3ff] transition'
          />
        </div>

        <div className='relative w-full sm:w-56'>
          <Languages className='absolute left-3 top-3 text-gray-400' size={18} />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className='w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-[#00f3ff] transition text-white'
          >
            <option value='en'>English</option>
            <option value='auto'>Auto detect</option>
          </select>
        </div>

        <button
          onClick={fetchTranscript}
          disabled={isLoading}
          className={'px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition w-full xl:w-auto ' + (isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#00f3ff]/20 text-[#00f3ff] hover:bg-[#00f3ff]/40 border border-[#00f3ff]/50')}
        >
          {isLoading ? <><RefreshCw size={18} className='animate-spin' /> Fetching...</> : <><Sparkles size={18} /> Get Transcript</>}
        </button>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <button
          onClick={() => setIsMarkdown(false)}
          className={'px-3 py-2 rounded-lg border text-sm transition ' + (!isMarkdown ? 'bg-[#00f3ff]/15 border-[#00f3ff]/40 text-[#00f3ff]' : 'bg-white/5 border-white/10 text-gray-300')}
        >
          Plain Transcript
        </button>
        <button
          onClick={() => setIsMarkdown(true)}
          disabled={!transcriptText}
          className={'px-3 py-2 rounded-lg border text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ' + (isMarkdown ? 'bg-[#00f3ff]/15 border-[#00f3ff]/40 text-[#00f3ff]' : 'bg-white/5 border-white/10 text-gray-300')}
        >
          Markdown Format
        </button>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-[320px]'>
        <div className='bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col min-h-[320px]'>
          <h3 className='text-sm font-bold text-gray-400 mb-3 flex items-center gap-2'><FileText size={16} /> Transcript Status</h3>

          <div className='text-sm text-gray-300 mb-4'>{status}</div>

          {isLoading && (
            <div className='space-y-3 mb-4'>
              <div className='h-4 w-3/4 rounded-full bg-white/10 animate-pulse' />
              <div className='h-4 w-5/6 rounded-full bg-white/10 animate-pulse' />
              <div className='h-4 w-2/3 rounded-full bg-white/10 animate-pulse' />
            </div>
          )}

          {transcript && (
            <div className='space-y-3 text-sm text-gray-200'>
              <div className='flex flex-wrap gap-2 text-xs text-gray-400'>
                {transcript.lang && <span className='px-2 py-1 rounded bg-white/5 border border-white/10'>Lang: {transcript.lang}</span>}
                {Array.isArray(transcript.availableLangs) && transcript.availableLangs.length > 0 && (
                  <span className='px-2 py-1 rounded bg-white/5 border border-white/10'>Available: {transcript.availableLangs.join(', ')}</span>
                )}
                {transcript.status && <span className='px-2 py-1 rounded bg-white/5 border border-white/10'>Status: {transcript.status}</span>}
              </div>

              {transcriptText && (
                <div className='bg-black/60 border border-white/10 rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-[320px] overflow-y-auto'>
                  {transcriptText}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col min-h-[320px]'>
          <h3 className='text-sm font-bold text-gray-400 mb-3 flex items-center gap-2'><Sparkles size={16} /> TIPS</h3>

          <div className='space-y-3 text-sm text-gray-300'>
            <div className='p-3 rounded-lg border border-white/10 bg-white/5'>
              Use a short YouTube link for the fastest result.
            </div>
            <div className='p-3 rounded-lg border border-white/10 bg-white/5'>
              If the transcript is queued, the app will poll automatically until it is ready.
            </div>
            <div className='p-3 rounded-lg border border-white/10 bg-white/5'>
              Typical wait time is 1 minute.
            </div>
          </div>

          <div className='mt-auto pt-4 flex flex-col sm:flex-row gap-3'>
            <button
              onClick={copyTranscript}
              disabled={!transcriptText}
              className='px-4 py-2 bg-white/5 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-white/10 hover:border-[#00f3ff]/50 rounded-lg flex items-center justify-center gap-2 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {copied ? <Check size={16} className='text-green-400' /> : <Copy size={16} />}
              {copied ? 'Copied' : (isMarkdown ? 'Copy Markdown' : 'Copy Transcript')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}