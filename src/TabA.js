import React, { useState, useEffect } from 'react';
import useAppStore from './store';
import { TrendingUp, ExternalLink, Send, RefreshCw } from 'lucide-react';

export default function TabA() {
  const { setActiveTab, setTargetAudienceProfile } = useAppStore();

  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrends = async () => {
    try {
      setIsLoading(true);

      const res = await fetch('http://localhost:5000/api/trends');

      if (!res.ok) {
        throw new Error('Backend failed');
      }

      const data = await res.json();

      setTrends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setTrends([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  return (
    <div className='flex flex-col h-full text-white'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold mb-2 flex items-center gap-2'>
            <TrendingUp className='text-[#00f3ff]' />
            Trend Scraper
          </h2>

          <p className='text-gray-400'>
            Discover live Reddit + YouTube Shorts trends.
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
              className='bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between group hover:border-[#00f3ff]/50 transition'
            >
              <div className='mb-4'>
                <div className='flex justify-between items-start mb-2'>
                  <span className='text-xs font-semibold px-2 py-1 bg-white/10 rounded text-gray-300'>
                    {trend.sourcePlatform}
                  </span>

                  <a
                    href={trend.linkUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-gray-500 hover:text-[#00f3ff] transition'
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <h3 className='font-bold text-lg leading-tight'>
                  {trend.title}
                </h3>

                <p className='text-[#00f3ff] text-sm mt-2'>
                  {trend.metrics}
                </p>
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