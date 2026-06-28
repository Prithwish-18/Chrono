import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthGateProps {
  onSuccess: () => void;
}

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const friendlyAuthError = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try signing in.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) {
      setError('Please enter your name.');
      return;
    }
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      
      // Save user profile doc to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        createdAt: new Date().toISOString()
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-gate" className="fixed inset-0 z-[9999] bg-radial from-[#220404] to-[#0a0000] flex items-center justify-center p-4">
      <div className="bg-[#2A1010] border border-[#442020] rounded-[30px] p-8 md:p-12 w-full max-w-[430px] flex flex-col gap-5 shadow-2xl">
        
        {/* Logo and Name row (Left-aligned) */}
        <div>
          <div className="flex items-center gap-4 justify-start mb-1 animate-fade-in">
            {imageError ? (
              <svg viewBox="0 0 100 100" className="h-14 w-14 drop-shadow-[0_4px_12px_rgba(255,81,13,0.5)]">
                {/* Outer orange clock body */}
                <circle cx="50" cy="50" r="44" fill="#E65F2B" stroke="#A7330D" strokeWidth="2" />
                <circle cx="50" cy="50" r="38" fill="#F49134" />
                
                {/* Clock face ticks */}
                <line x1="50" y1="18" x2="50" y2="22" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="50" y1="78" x2="50" y2="82" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="50" x2="22" y2="50" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="78" y1="50" x2="82" y2="50" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
                
                <line x1="28" y1="28" x2="31" y2="31" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
                <line x1="72" y1="28" x2="69" y2="31" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
                <line x1="28" y1="72" x2="31" y2="69" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
                <line x1="72" y1="72" x2="69" y2="69" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />

                {/* Eyes */}
                <ellipse cx="38" cy="42" rx="7" ry="11" fill="#FBF3DB" stroke="#1A0202" strokeWidth="2" />
                <ellipse cx="38" cy="42" rx="3.5" ry="6" fill="#1A0202" />
                <circle cx="37" cy="39" r="1.5" fill="#FFFFFF" />
                
                <ellipse cx="62" cy="42" rx="7" ry="11" fill="#FBF3DB" stroke="#1A0202" strokeWidth="2" />
                <ellipse cx="62" cy="42" rx="3.5" ry="6" fill="#1A0202" />
                <circle cx="61" cy="39" r="1.5" fill="#FFFFFF" />

                {/* Eyelashes */}
                <path d="M 32 32 Q 35 27 35 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
                <path d="M 38 31 Q 39 25 39 25" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
                <path d="M 44 32 Q 43 27 43 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />

                <path d="M 56 32 Q 57 27 57 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
                <path d="M 62 31 Q 61 25 61 25" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
                <path d="M 68 32 Q 65 27 65 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />

                {/* Smiling mouth */}
                <path d="M 42 56 Q 50 62 58 56" fill="none" stroke="#1A0202" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 41 57 C 40 55 43 54 43 54" fill="none" stroke="#1A0202" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 59 57 C 60 55 57 54 57 54" fill="none" stroke="#1A0202" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Hands */}
                <line x1="50" y1="50" x2="50" y2="35" stroke="#1A0202" strokeWidth="3" strokeLinecap="round" />
                <line x1="50" y1="50" x2="64" y2="50" stroke="#1A0202" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="50" r="4" fill="#1A0202" />

                {/* Cheeks */}
                <circle cx="31" cy="51" r="2.5" fill="#E65F2B" opacity="0.6" />
                <circle cx="69" cy="51" r="2.5" fill="#E65F2B" opacity="0.6" />
              </svg>
            ) : (
              <img 
                src="https://cdn.dribbble.com/userupload/10905160/file/original-6c2179d180b7931102af662df509ada7.jpg?resize=1504x1128&vertical=center" 
                alt="Chrono Logo" 
                className="h-14 w-14 object-cover drop-shadow-[0_4px_12px_rgba(255,81,13,0.5)] rounded-full border border-orange-500/30"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            )}
            <span className="text-4xl md:text-5xl font-bold text-[#FBF3DB] tracking-tight font-sans flex items-center">
              Chrono
              <span className="w-[2.5px] h-[36px] bg-[#FBF3DB] ml-1.5 inline-block opacity-90 animate-pulse"></span>
            </span>
          </div>
          <p className="text-[#FBF3DB]/50 text-base text-left mt-1.5 pl-0.5">Your last-minute life saver.</p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex bg-[#1C0606] rounded-xl p-1 gap-1 mt-1 border border-[#442020]/40">
          <button 
            type="button"
            className={`flex-1 py-3.5 rounded-lg text-base font-bold transition-all cursor-pointer ${
              activeTab === 'login' 
                ? 'bg-[#821717] text-white shadow-md border-0' 
                : 'bg-transparent text-[#FBF3DB]/40 hover:text-[#FBF3DB]/60'
            }`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`flex-1 py-3.5 rounded-lg text-base font-bold transition-all cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-[#821717] border border-white text-white shadow-md' 
                : 'bg-transparent text-[#FBF3DB]/40 hover:text-[#FBF3DB]/60'
            }`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Form Container */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-1">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="email"
              disabled={loading}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="current-password"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="p-4 rounded-xl bg-gradient-to-r from-[#FF510D] to-[#8E1616] text-white text-base font-bold cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(255,81,13,0.35)] active:scale-98"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            {error && <p className="text-sm text-[#ff8a8a] text-center mt-1">{error}</p>}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4 mt-1">
            <input 
              type="text" 
              placeholder="Your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="name"
              disabled={loading}
            />
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="email"
              disabled={loading}
            />
            <input 
              type="password" 
              placeholder="Password (min 6 chars)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="new-password"
              disabled={loading}
            />
            <input 
              type="password" 
              placeholder="Confirm password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="p-4 rounded-xl border border-[#451F1F] bg-[#2C1313] text-[#FBF3DB] text-base outline-none transition-all focus:border-[#FF510D] placeholder:text-[#FBF3DB]/35"
              autoComplete="new-password"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="p-4 rounded-xl bg-gradient-to-r from-[#FF510D] to-[#8E1616] text-white text-base font-bold cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(255,81,13,0.35)] active:scale-98"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            {error && <p className="text-sm text-[#ff8a8a] text-center mt-1">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
