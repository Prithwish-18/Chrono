import { useState, useEffect } from 'react';
import { useGCal, GCalEvent } from '../gcal/GCalContext';

const themes = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600", // mountains
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600", // lake forest
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600", // snowy peaks
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1600", // sunrise field
  "https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?w=1600"  // ocean
];

const weatherCodes: { [key: number]: string } = {
  0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 71: "Light Snow", 73: "Snow",
  75: "Heavy Snow", 80: "Rain Showers", 81: "Rain Showers", 82: "Heavy Showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
};

interface HeroBannerProps {
  currentThemeIndex: number;
  onThemeChange: () => void;
}

export default function HeroBanner({ currentThemeIndex, onThemeChange }: HeroBannerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isConnected, fetchTodayEvents } = useGCal();
  const [bannerEvents, setBannerEvents] = useState<GCalEvent[]>([]);
  const [weather, setWeather] = useState<{
    temp: string;
    condition: string;
    precip: string;
    humid: string;
    wind: string;
    loading: boolean;
  }>({
    temp: "--°C",
    condition: "Loading weather...",
    precip: "--",
    humid: "--",
    wind: "--",
    loading: true
  });

  useEffect(() => {
    // Clock interval
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Weather fetcher
    const fetchWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=22.5726&longitude=88.3639&current=temperature_2m,precipitation,windspeed_10m,weathercode,relativehumidity_2m&windspeed_unit=kmh");
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        
        const current = data.current;
        if (current) {
          setWeather({
            temp: `${current.temperature_2m.toFixed(1)}°C`,
            condition: weatherCodes[current.weathercode] || "Unknown",
            precip: current.precipitation.toString(),
            humid: current.relativehumidity_2m.toString(),
            wind: current.windspeed_10m.toString(),
            loading: false
          });
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeather({
          temp: "--°C",
          condition: "Error loading weather",
          precip: "--",
          humid: "--",
          wind: "--",
          loading: false
        });
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins refresh

    return () => {
      clearInterval(clockTimer);
      clearInterval(weatherTimer);
    };
  }, []);

  // Fetch events for banner when calendar is connected
  useEffect(() => {
    if (!isConnected) { setBannerEvents([]); return; }
    const load = async () => {
      const now = new Date();
      try {
        const events = await fetchTodayEvents();
        const remaining = events.filter(ev => {
          if (!ev.start.dateTime) return true; // all-day events always show
          return new Date(ev.start.dateTime) >= now;
        });
        setBannerEvents(remaining.slice(0, 4)); // max 4 chips
      } catch (err) {
        console.error("Error loading banner events:", err);
      }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isConnected, fetchTodayEvents]);

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const dayOfWeek = currentTime.toLocaleDateString('en-IN', { weekday: 'long' });
  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div 
      className="relative mx-10 my-6 h-[38vh] min-h-[280px] bg-cover bg-center rounded-2xl overflow-hidden flex items-end p-6 md:p-10 shadow-xl transition-all duration-700"
      style={{ backgroundImage: `url('${themes[currentThemeIndex]}')` }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70 pointer-events-none z-[1]" />

      {/* Grid */}
      <div className="relative w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-end z-[2] text-white select-none">
        
        {/* Left Zone: Live clock */}
        <div className="flex flex-col justify-end text-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <div className="text-2xl font-light tracking-wider uppercase font-sans">Kolkata</div>
          <div className="text-base font-medium opacity-90 my-1 font-sans">{formattedDate}</div>
          <div className="text-3xl md:text-5xl font-bold tracking-tight font-sans">
            <span className="text-xs md:text-lg font-normal block tracking-wider text-[#ffbf64]/80 uppercase">{dayOfWeek}</span>
            {formattedTime}
          </div>

          {/* Calendar Events Strip — only shown when connected and events exist */}
          {bannerEvents.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {bannerEvents.map(ev => {
                const timeStr = ev.start.dateTime
                  ? new Date(ev.start.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : 'All day';
                return (
                  <span
                    key={ev.id}
                    className="bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
                  >
                    🗓 {timeStr} — {ev.summary || 'Event'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Zone: Spacer */}
        <div className="hidden md:flex justify-center items-center h-full" />

        {/* Right Zone: Weather Details */}
        <div className="text-left md:text-right flex flex-col items-start md:items-end justify-end drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <div className="text-5xl md:text-6xl font-bold font-sans tracking-tighter leading-none">{weather.temp}</div>
          <div className="text-lg font-semibold my-1 md:my-2 font-sans text-[#ffbf64]">{weather.condition}</div>
          <div className="flex flex-col gap-1 text-xs md:text-sm font-medium opacity-90 font-mono">
            <div>Precipitation: <span className="text-white font-semibold">{weather.precip}%</span></div>
            <div>Humidity: <span className="text-white font-semibold">{weather.humid}%</span></div>
            <div>Wind Speed: <span className="text-white font-semibold">{weather.wind} km/h</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
