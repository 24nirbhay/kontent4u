import React, { useState } from 'react'; 
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL; 
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 

export default function Auth({ onLogin }) { 
  const [loading, setLoading] = useState(false); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 

 const handleGoogleLogin = async () => { 
    try { 
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: window.location.origin 
        }
      }); 
      if (error) throw error; 
    } catch (error) { 
      alert(error.message); 
    } 
  };

  const handleEmailLogin = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    try { 
      const { data, error } = await supabase.auth.signInWithPassword({ email, password }); 
      if (error) { 
        if (error.message.includes('Invalid login')) { 
          const signUpRes = await supabase.auth.signUp({ email, password }); 
          if (signUpRes.error) throw signUpRes.error; 
          alert('Check your email for the login link! (Note: Supabase limits email auths to approx 2 per hour)'); 
        } else { 
          throw error; 
        } 
      } else if (data.session) { 
        onLogin(data.session); 
      } 
    } catch (error) { 
      alert(error.message); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'>
      <div className='w-full max-w-md p-8 bg-black/60 border border-white/10 rounded-2xl shadow-2xl'>
        <h2 className='text-3xl font-bold text-white mb-6 tracking-tight text-center'>
          Access kontent<span className='text-[#00f3ff]'>4u</span>
        </h2>
        
        <button onClick={handleGoogleLogin} className='w-full py-3 mb-6 bg-white hover:bg-gray-200 text-black rounded-lg transition font-bold min-h-[44px] flex items-center justify-center gap-2'>
          <img src='https://www.svgrepo.com/show/475656/google-color.svg' alt='Google' className='w-5 h-5' /> 
          Continue with Google
        </button>
        
        <div className='flex items-center mb-6'>
          <div className='flex-1 border-t border-white/10'></div>
          <span className='px-4 text-gray-500 text-sm'>OR</span>
          <div className='flex-1 border-t border-white/10'></div>
        </div>
        
        <form onSubmit={handleEmailLogin} className='space-y-4'>
          <input type='email' placeholder='Email address' value={email} onChange={(e) => setEmail(e.target.value)} className='w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-[#00f3ff] transition text-white min-h-[44px]' required />
          <input type='password' placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} className='w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-[#00f3ff] transition text-white min-h-[44px]' required />
          <button type='submit' disabled={loading} className='w-full py-3 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/40 text-[#00f3ff] border border-[#00f3ff]/50 rounded-lg transition font-bold min-h-[44px]'>
            {loading ? 'Processing...' : 'Continue with Email'}
          </button>
        </form>
        
        <p className='mt-4 text-center text-gray-500 text-xs'>
          Ur email will only work once/h.
        </p>
      </div>
    </div>
  ); 
}