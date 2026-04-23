import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Location {
  lat: number;
  lng: number;
  city?: string;
  display_name?: string;
}

interface LocationContextType {
  userLocation: Location | null;
  searchLocation: Location | null;
  loading: boolean;
  error: string | null;
  setSearchLocation: (loc: Location | null) => void;
  refreshUserLocation: () => Promise<void>;
  searchByQuery: (query: string) => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default center (Pune)
const DEFAULT_LOCATION: Location = {
  lat: 18.5204,
  lng: 73.8567,
  city: "Pune",
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchLocation, setSearchLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIPFallback = async () => {
    try {
      const res = await fetch("/api/location/ip");
      if (res.ok) {
        const data = await res.json();
        return data as Location;
      }
    } catch (e) {
      console.error("IP Fallback failed", e);
    }
    return DEFAULT_LOCATION;
  };

  const refreshUserLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setLoading(false);
        },
        async (err) => {
          console.warn("GPS failed, trying IP fallback", err);
          const fallback = await fetchIPFallback();
          setUserLocation(fallback);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      const fallback = await fetchIPFallback();
      setUserLocation(fallback);
      setLoading(false);
    }
  }, []);

  const searchByQuery = async (query: string): Promise<boolean> => {
    if (!query.trim()) return false;
    setLoading(true);
    try {
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchLocation(data);
        setLoading(false);
        return true;
      }
    } catch (e) {
      console.error("Search failed", e);
    }
    setLoading(false);
    return false;
  };

  useEffect(() => {
    refreshUserLocation();
  }, [refreshUserLocation]);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        searchLocation,
        loading,
        error,
        setSearchLocation,
        refreshUserLocation,
        searchByQuery,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocationContext must be used within a LocationProvider");
  }
  return context;
};
