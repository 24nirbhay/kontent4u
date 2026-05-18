import React, { useState, useEffect, useCallback } from 'react';
import useAppStore from './store';
import { TrendingUp, ExternalLink, Send, RefreshCw } from 'lucide-react';

export default function TabA() {
  const { setActiveTab, setTargetAudienceProfile, setScrapedTrendsCache } = useAppStore();
  const apiBase = (
    process.env.REACT_APP_BACKEND_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')
  ).replace(/\/$/, '');

  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedState, setFeedState] = useState('Loading live YouTube trends...');

  const fetchTrends = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await fetch(`${apiBase}/api/trends`);

      if (!res.ok) {
        throw new Error('Backend failed');
      }

      const data = await res.json();

      const nextTrends = Array.isArray(data)
        ? data
        : Array.isArray(data?.trends)
          ? data.trends
          : [];

      setTrends(nextTrends);
      if (nextTrends.length > 0) {
        setScrapedTrendsCache(nextTrends);
        setFeedState('Live trends loaded.');
      } else {
        setFeedState('No live YouTube trends were returned, showing fallback content if available.');
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      const cachedTrends = useAppStore.getState().scrapedTrendsCache;

      if (Array.isArray(cachedTrends) && cachedTrends.length > 0) {
        setTrends(cachedTrends);
        setFeedState('Live fetch failed, showing cached trends.');
      } else {
        setTrends([]);
        setFeedState('No trends available right now.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, setScrapedTrendsCache]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return (
    <div className='flex flex-col h-full text-white'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold mb-2 flex items-center gap-2'>
            <TrendingUp className='text-[#00f3ff]' />
            Trends
          </h2>

          <p className='text-gray-400'>
            Discover live YouTube Shorts trends here , insta api ke  liye paisa nahi merepe.
          </p>
        </div>

        <button
          onClick={fetchTrends}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/30 hover:bg-[#00f3ff]/20 text-[#00f3ff] transition'
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto'>
        <div className='col-span-full text-xs text-gray-400'>
          {feedState}
        </div>

        {isLoading ? (
          <div className='text-[#00f3ff] animate-pulse'>
            Fetching live trends...
          </div>
        ) : trends.length === 0 ? (
          <div className='text-gray-400'>
            No trends available right now.
          </div>
        ) : (
          trends.map((trend) => (
            <div
              key={trend.id}
              className='bg-black/50 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col justify-between gap-3 group hover:border-[#00f3ff]/50 transition-transform duration-300 hover:-translate-y-1 focus-within:-translate-y-1'
            >
              {trend.embedUrl && (
                <div className='overflow-hidden rounded-lg border border-white/10 bg-black/70 aspect-video relative'>
                  <iframe
                    title={trend.title}
                    src={trend.embedUrl}
                    className='absolute inset-0 h-full w-full'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    referrerPolicy='strict-origin-when-cross-origin'
                    loading='lazy'
                  />

                  <div className='pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 text-[11px] text-white/70'>
                    Embedded short preview
                  </div>
                </div>
              )}

              <div className='space-y-3'>
                <div className='flex justify-between items-start gap-3'>
                  <span className='text-[11px] sm:text-xs font-semibold px-2 py-1 bg-white/10 rounded text-gray-300 shrink-0'>
                    {trend.sourcePlatform}
                  </span>

                  <a
                    href={trend.linkUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-gray-500 hover:text-[#00f3ff] transition shrink-0'
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <h3 className='font-bold text-base sm:text-lg leading-tight line-clamp-2'>
                  {trend.title}
                </h3>
              </div>

              <button
                onClick={() => {
                  setTargetAudienceProfile(
                    'Context Idea based on trend: ' + trend.title
                  );

                  setActiveTab('The Arena');
                }}
                className='w-full py-2 bg-white/5 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-white/10 hover:border-[#00f3ff]/50 rounded-lg flex items-center justify-center gap-2 transition text-sm font-medium'
              >
                <Send size={16} />
                Send to Brainstorm Arena
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}