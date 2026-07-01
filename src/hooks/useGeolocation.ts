import { useState, useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  cityName: string;
  loading: boolean;
  error: string | null;
}

const KOLKATA_FALLBACK = { latitude: 22.5726, longitude: 88.3639, cityName: 'Kolkata' };

export function useGeolocation(): LocationData {
  const [state, setState] = useState<LocationData>({
    latitude: KOLKATA_FALLBACK.latitude,
    longitude: KOLKATA_FALLBACK.longitude,
    cityName: KOLKATA_FALLBACK.cityName,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Check cache first - avoid asking permission every reload
    const cached = sessionStorage.getItem('chrono_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setState({ ...parsed, loading: false, error: null });
        return;
      } catch (err) {
        console.error('Failed to parse cached location:', err);
      }
    }

    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let cityName = 'Your Location';

        // Reverse geocode using free, client-side BigDataCloud reverse geocoding API (no API key required)
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            cityName = revData.city || revData.locality || revData.principalSubdivision || 'Your Location';
          }
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
        }

        const result = { latitude, longitude, cityName };
        sessionStorage.setItem('chrono_location', JSON.stringify(result));
        setState({ ...result, loading: false, error: null });
      },
      (error) => {
        console.warn('Geolocation denied or failed:', error.message);
        // Fallback to Kolkata, but mark it so UI can show a note
        setState({ ...KOLKATA_FALLBACK, loading: false, error: 'permission_denied' });
      },
      { timeout: 8000, maximumAge: 1000 * 60 * 30 } // Cache browser-side for 30 min
    );
  }, []);

  return state;
}
