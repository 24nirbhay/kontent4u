import React, { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import useAppStore from "./store";
import TabA from "./TabA";
import TabB from "./TabB";
import TabC from "./TabC";
import Auth, { supabase } from "./Auth";

export default function App() {
  const { activeTab, setActiveTab } = useAppStore();
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const showAuth = useAppStore((s) => s.showAuth);
  const closeAuth = useAppStore((s) => s.closeAuth);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If a session exists (OAuth redirect completed), ensure auth modal is closed
      if (session) useAppStore.getState().closeAuth();
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // close modal automatically when a session becomes available
      if (session) useAppStore.getState().closeAuth();
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-[#00f3ff] font-mono text-sm animate-pulse">
        ek sec rav load zata...
      </div>
    );
  }

  return (
  <div className="relative min-h-screen bg-black text-white overflow-x-hidden overflow-y-auto">

    {/* BACKGROUND VIDEO */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="fixed inset-0 w-full h-full object-cover z-0 opacity-96 scale-[1.02]"
    >
      <source src="/cherrymine.mp4" type="video/mp4" />
    </video>

    {/* LIGHTER OVERLAYS */}
    <div className="fixed inset-0 bg-black/38 z-[1]" />
    <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60 z-[2]" />

    <div className="relative z-10 flex flex-col min-h-screen">

      {/* Small toast explaining why auth modal opened for unauthenticated users */}
      {showAuth && !session && (
        <div className="fixed top-4 right-4 z-60 bg-black/70 border border-white/10 text-sm text-gray-200 px-3 py-2 rounded-lg shadow-md flex items-center gap-3">
          <div>Please sign in to use protected features (e.g. Arena).</div>
          <button onClick={() => closeAuth()} className="text-xs text-[#00f3ff] px-2 py-1 rounded hover:bg-white/5">Close</button>
        </div>
      )}

      {/* HEADER */}
      <header className="px-4 py-3 md:px-5 md:py-3 flex items-center justify-between gap-3 bg-black/35 border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">

        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white/90">
          kontent<span className="text-[#00f3ff]">4u</span>
        </h1>

        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
          {session ? (
            <>
              <span className="hidden md:block text-[11px] text-gray-300 max-w-[220px] truncate">
                {session.user.email}
              </span>

              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1.5 bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition text-xs font-medium whitespace-nowrap"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => useAppStore.getState().openAuth()}
              className="px-3 py-1.5 bg-[#00f3ff]/20 text-[#00f3ff] hover:bg-[#00f3ff]/40 border border-[#00f3ff]/30 rounded-lg transition text-xs font-medium whitespace-nowrap"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-[34vh] sm:min-h-[42vh] md:min-h-[72vh] flex items-center justify-center px-4 py-6 md:py-8 text-center">

        <div className="max-w-2xl">

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white/95 mb-3 leading-tight">
            Generate Content{" "}
            <span className="text-[#00f3ff]">Automatically</span>
          </h2>

          <p className="text-sm sm:text-base md:text-base text-gray-200 max-w-xl mx-auto">
            Discover trends, brainstorm ideas, and generate factual scripts.
          </p>

        </div>

      </section>

      {/* MAIN CONTENT SECTION */}
      <main className="relative z-20 px-2 sm:px-3 md:px-6 pb-10 flex justify-center -mt-2 sm:-mt-4">

        <div className="w-full max-w-7xl bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-3 md:p-5 min-h-[650px] shadow-[0_0_40px_rgba(0,0,0,0.35)] flex flex-col">

          {/* TAB NAV */}
          <div className="flex gap-2 border-b border-white/5 pb-3 mb-4 overflow-x-auto whitespace-nowrap">

            {["Trend Scraper", "The Arena", "Transcript"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  "px-4 py-2 rounded-xl transition text-sm font-medium " +
                  (activeTab === tab
                    ? "bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]")
                }
              >
                {tab}
              </button>
            ))}

          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-hidden">

            {activeTab === "Trend Scraper" && (
              <TabA session={session} />
            )}

            {activeTab === "The Arena" && (
              <TabB session={session} />
            )}

            {activeTab === "Transcript" && (
              <TabC session={session} />
            )}

            {/* Auth modal can be opened from any tab via the store (openAuth) */}
            {showAuth && <Auth onLogin={(s) => { setSession(s); closeAuth(); }} />}

          </div>

        </div>

      </main>
{/* FOOTER */}
<footer className="w-full flex justify-center py-1 text-xm text-white/35">

  ~made by <a href="https://github.com/24nirbhay" target="_blank" rel="noopener noreferrer">peru</a>

</footer>
    </div>
    <Analytics />
    <SpeedInsights />
  </div>
);}
