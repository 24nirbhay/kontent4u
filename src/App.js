import React, { useState, useEffect } from "react";
import useAppStore from "./store";
import TabA from "./TabA";
import TabB from "./TabB";
import Auth, { supabase } from "./Auth";

export default function App() {
  const { activeTab, setActiveTab } = useAppStore();
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

  if (!session) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">

        {/* BACKGROUND VIDEO */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 scale-105"
        >
          <source src="/cherrymine.mp4" type="video/mp4" />
        </video>

        {/* SOFT CINEMATIC OVERLAY */}
        <div className="absolute inset-0 bg-black/35 z-[1]" />

        {/* LOGIN CONTENT */}
        <div className="relative z-10">
          <Auth onLogin={setSession} />
        </div>
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
      className="fixed inset-0 w-full h-full object-cover z-0 opacity-90 scale-[1.02]"
    >
      <source src="/cherrymine.mp4" type="video/mp4" />
    </video>

    {/* LIGHTER OVERLAYS */}
    <div className="fixed inset-0 bg-black/20 z-[1]" />
    <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45 z-[2]" />

    <div className="relative z-10 flex flex-col min-h-screen">

      {/* HEADER */}
      <header className="px-4 py-2 md:px-5 md:py-3 flex justify-between items-center bg-black/20 border-b border-white/5 sticky top-0 z-50">

        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white/90">
          kontent<span className="text-[#00f3ff]">4u</span>
        </h1>

        <div className="flex items-center gap-3">

          <span className="text-[11px] text-gray-400 hidden md:block">
            {session.user.email}
          </span>

          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1 bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition text-xs font-medium"
          >
            Sign Out
          </button>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative h-[80vh] flex items-center justify-center px-4 text-center">

        <div className="max-w-2xl">

          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white/90 mb-3">
            Generate Content{" "}
            <span className="text-[#00f3ff]">Automatically</span>
          </h2>

          <p className="text-sm md:text-base text-gray-300">
            Discover trends, brainstorm ideas, and generate factual scripts.
          </p>

        </div>

      </section>

      {/* MAIN CONTENT SECTION */}
      <main className="relative z-20 px-2 md:px-6 pb-10 flex justify-center -mt-4">

        <div className="w-full max-w-7xl bg-black/35 backdrop-blur-md border border-white/10 rounded-3xl p-3 md:p-5 min-h-[650px] shadow-[0_0_40px_rgba(0,0,0,0.28)] flex flex-col">

          {/* TAB NAV */}
          <div className="flex gap-2 border-b border-white/5 pb-3 mb-4 overflow-x-auto whitespace-nowrap">

            {["Trend Scraper", "The Arena", "Transcriber"].map((tab) => (
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

            {activeTab === "Transcriber" && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">

                <span className="text-lg mb-2 text-white/80">
                  Video Transcriber
                </span>

                <span className="px-3 py-1 bg-white/[0.05] border border-white/10 rounded-full text-xs">
                  Feature Coming Soon
                </span>

              </div>
            )}

          </div>

        </div>

      </main>
{/* FOOTER */}
<footer className="w-full flex justify-center py-1 text-xm text-white/35">

  <a
    href="https://github.com/24nirbhay"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-[#00f3ff]/70 transition"
  >
    ~ made by peru
  </a>

</footer>
    </div>
  </div>
);}