import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const GCAL_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

interface GCalContextType {
  isConnected: boolean;
  accessToken: string | null;
  connect: () => void;
  disconnect: () => void;
  addEvent: (event: GCalEventInput) => Promise<GCalEvent | null>;
  fetchTodayEvents: () => Promise<GCalEvent[]>;
  fetchUpcomingEvents: (days?: number) => Promise<GCalEvent[]>;
}

export interface GCalEventInput {
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  description?: string;
}

export interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  colorId?: string;
}

const GCalContext = createContext<GCalContextType | null>(null);

export function GCalProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = localStorage.getItem('gcal_token');
    const expiry = localStorage.getItem('gcal_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      return token;
    }
    return null;
  });
  const [isConnected, setIsConnected] = useState(() => {
    const token = localStorage.getItem('gcal_token');
    const expiry = localStorage.getItem('gcal_token_expiry');
    return !!(token && expiry && Date.now() < parseInt(expiry, 10));
  });
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  });

  React.useEffect(() => {
    let active = true;
    const fetchConfig = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch('/api/config');
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          if (!active) return;
          if (data.googleClientId) {
            setGoogleClientId(data.googleClientId);
          }
          return; // Success
        } catch (err) {
          if (!active) return;
          if (i === retries - 1) {
            console.warn('Could not fetch runtime Google Client ID from backend (using client-side fallback if set):', err);
          } else {
            // Wait before next retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          }
        }
      }
    };
    fetchConfig();
    return () => {
      active = false;
    };
  }, []);

  const tokenClientRef = useRef<any>(null);

  // Initialize token client lazily (GIS must be loaded first)
  const getTokenClient = useCallback(() => {
    if (tokenClientRef.current) return tokenClientRef.current;
    if (typeof window === 'undefined' || !(window as any).google) return null;
    if (!googleClientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID environment variable is missing.');
      return null;
    }

    try {
      tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: GCAL_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            console.error('GCal OAuth error:', response.error);
            return;
          }
          setAccessToken(response.access_token);
          setIsConnected(true);
          // Store token & expiry (token lasts 1 hour)
          localStorage.setItem('gcal_token', response.access_token);
          localStorage.setItem('gcal_token_expiry', String(Date.now() + response.expires_in * 1000));
        }
      });
      return tokenClientRef.current;
    } catch (err) {
      console.error('Error initializing GCal token client:', err);
      return null;
    }
  }, [googleClientId]);

  const connect = useCallback(() => {
    if (!googleClientId) {
      alert('⚠️ Google Calendar Client ID is missing.\nPlease define VITE_GOOGLE_CLIENT_ID in your .env or Settings (Environment Variables).');
      return;
    }
    // Wait for GIS to load if not ready yet
    const tryConnect = () => {
      const client = getTokenClient();
      if (!client) { setTimeout(tryConnect, 300); return; }
      client.requestAccessToken({ prompt: 'consent' });
    };
    tryConnect();
  }, [googleClientId, getTokenClient]);

  const disconnect = useCallback(() => {
    if (accessToken && (window as any).google) {
      (window as any).google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsConnected(false);
        localStorage.removeItem('gcal_token');
        localStorage.removeItem('gcal_token_expiry');
      });
    } else {
      setAccessToken(null);
      setIsConnected(false);
      localStorage.removeItem('gcal_token');
      localStorage.removeItem('gcal_token_expiry');
    }
  }, [accessToken]);

  // Generic Calendar API fetch helper
  const calendarFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!accessToken) throw new Error('Not connected to Google Calendar');
    const res = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      // Token expired — disconnect and prompt reconnect
      setAccessToken(null);
      setIsConnected(false);
      throw new Error('Calendar session expired. Please reconnect.');
    }
    if (!res.ok) {
      let errorMessage = `Calendar API error: ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson?.error?.message) {
          errorMessage = `${errorJson.error.message} (${res.status})`;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return res.json();
  }, [accessToken]);

  const fetchTodayEvents = useCallback(async (): Promise<GCalEvent[]> => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    try {
      const data = await calendarFetch(
        `/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`
      );
      return data.items || [];
    } catch { return []; }
  }, [calendarFetch]);

  const fetchUpcomingEvents = useCallback(async (days = 7): Promise<GCalEvent[]> => {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    try {
      const data = await calendarFetch(
        `/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=20`
      );
      return data.items || [];
    } catch { return []; }
  }, [calendarFetch]);

// Helper to safely parse time strings (e.g. "9:00 PM", "18:30", "9:00") into "HH:MM" 24h format
function parseTimeTo24h(timeStr: string): string {
  if (!timeStr) return '12:00';
  let s = timeStr.trim().toUpperCase();
  
  // Check for AM/PM
  const isPm = s.includes('PM');
  const isAm = s.includes('AM');
  
  // Remove all characters except digits and colons
  s = s.replace(/[^0-9:]/g, '');
  
  const parts = s.split(':');
  if (parts.length === 0 || !parts[0]) return '12:00';
  
  let hours = parseInt(parts[0], 10) || 0;
  let minutes = parts[1] ? (parseInt(parts[1], 10) || 0) : 0;
  
  if (isPm && hours < 12) {
    hours += 12;
  } else if (isAm && hours === 12) {
    hours = 0;
  }
  
  hours = Math.max(0, Math.min(23, hours));
  minutes = Math.max(0, Math.min(59, minutes));
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Helper to safely normalize dates into "YYYY-MM-DD"
function parseDateToYMD(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  const s = dateStr.trim();
  
  // Case 1: YYYY-MM-DD or YYYY/MM/DD
  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // Case 2: DD-MM-YYYY or DD/MM/YYYY
  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  
  return new Date().toISOString().split('T')[0];
}

  const addEvent = useCallback(async (input: GCalEventInput): Promise<GCalEvent | null> => {
    try {
      const cleanDate = parseDateToYMD(input.date);
      const cleanStart = parseTimeTo24h(input.startTime);
      const cleanEnd = parseTimeTo24h(input.endTime);
      
      let startDateObj = new Date(`${cleanDate}T${cleanStart}:00`);
      let endDateObj = new Date(`${cleanDate}T${cleanEnd}:00`);
      
      if (isNaN(startDateObj.getTime())) {
        startDateObj = new Date();
      }
      if (isNaN(endDateObj.getTime())) {
        endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000); // 1 hour duration
      }
      
      // If end time is less than or equal to start time, it means it crosses midnight!
      if (endDateObj <= startDateObj) {
        endDateObj.setDate(endDateObj.getDate() + 1);
      }
      
      const startISO = startDateObj.toISOString();
      const endISO = endDateObj.toISOString();
      
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      
      const body = {
        summary: input.title,
        description: input.description || '',
        start: { dateTime: startISO, timeZone: userTimeZone },
        end: { dateTime: endISO, timeZone: userTimeZone }
      };

      const created = await calendarFetch('/calendars/primary/events', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return created;
    } catch (e) {
      console.error('addEvent error:', e);
      throw e;
    }
  }, [calendarFetch]);

  return (
    <GCalContext.Provider value={{ isConnected, accessToken, connect, disconnect, addEvent, fetchTodayEvents, fetchUpcomingEvents }}>
      {children}
    </GCalContext.Provider>
  );
}

export function useGCal() {
  const ctx = useContext(GCalContext);
  if (!ctx) throw new Error('useGCal must be used inside GCalProvider');
  return ctx;
}
