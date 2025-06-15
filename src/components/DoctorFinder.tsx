import React, { useState, useEffect } from 'react';
import { Map, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DoctorFinderProps {
  language: 'english' | 'hindi';
}

interface Translations {
  title: string;
  currentLocation: string;
  loading: string;
  mapError: string;
  coordinates: string;
  apiError: string;
  openInGoogleMaps: string;
}

const translations: { [key: string]: Translations } = {
  english: {
    title: "Map View",
    currentLocation: "Nearby Doctors",
    loading: "Loading map...",
    mapError: "Unable to load map. Please ensure the Maps API is properly configured.",
    coordinates: "Coordinates",
    apiError: "Google Maps API Error: Please ensure the API key is properly configured and the Maps Embed API is enabled.",
    openInGoogleMaps: "Open in Google Maps",
  },
  hindi: {
    title: "मानचित्र दृश्य",
    currentLocation: "पास के डॉक्टर",
    loading: "मैप लोड हो रहा है...",
    mapError: "मैप लोड करने में असमर्थ। कृपया सुनिश्चित करें कि मैप्स API सही ढंग से कॉन्फ़िgurere की गई है।",
    coordinates: "निर्देशांक",
    apiError: "Google Maps API त्रुटि: कृपया सुनिश्चित करें कि API कुंजी सही ढंग से कॉन्फ़िgurere की गई है और Maps Embed API सक्षम है।",
    openInGoogleMaps: "गूगल मैप्स में खोलें",
  }
};

const DoctorFinder: React.FC<DoctorFinderProps> = ({ language }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  const t = translations[language];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError(t.mapError);
          setLoading(false);
          // Default to New Delhi coordinates if location access fails
          setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
        }
      );
    } else {
      setError(t.mapError);
      setLoading(false);
      // Default to New Delhi coordinates if geolocation is not available
      setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, [t.mapError]);

  const handleMapError = () => {
    setMapError(true);
    console.error('Map failed to load');
  };

  return (
    <div className="space-y-6">
      <Card className="flex-1 glass-card border-white/10 rounded-2xl shadow-lg-glass">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 text-center">{t.currentLocation}</h2>
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-gold" />
              <p className="ml-3 text-neutral-600">{t.loading}</p>
            </div>
          ) : error ? (
            <div className="h-[600px] flex items-center justify-center">
              <p className="text-error-600">{error}</p>
            </div>
          ) : currentLocation ? (
            mapError ? (
              <div className="h-[600px] flex flex-col items-center justify-center space-y-4">
                <Map className="w-12 h-12 text-foreground/40" />
                <p className="text-foreground/60 text-center max-w-md">{t.apiError}</p>
                <div className="text-sm text-foreground/40">
                  <p>{t.coordinates}:</p>
                  <p>Latitude: {currentLocation.lat.toFixed(6)}</p>
                  <p>Longitude: {currentLocation.lng.toFixed(6)}</p>
                </div>
              </div>
            ) : (
              <>
                {currentLocation && (
                  <Button
                    onClick={() => {
                      if (currentLocation) {
                        window.open(`https://www.google.com/maps/search/?api=1&query=doctors+near+${currentLocation.lat},${currentLocation.lng}`, '_blank');
                      } else {
                        // Fallback to a default location if current location is not available
                        window.open(`https://www.google.com/maps/search/?api=1&query=doctors+near+28.6139,77.2090`, '_blank'); // New Delhi
                      }
                    }}
                    className="w-3/4 mx-auto py-4 text-xl font-bold bg-muted-gold/80 text-gray-900 hover:bg-muted-gold/70 shadow-xl mb-4 block text-center rounded-2xl border border-white/20"
                  >
                    {t.openInGoogleMaps}
                  </Button>
                )}
                <div className="h-[600px] rounded-xl overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyB4E6GkCkmiScNMQSs5oukdpZ40FWx_0u8&center=${currentLocation.lat},${currentLocation.lng}&zoom=15`}
                    allowFullScreen
                    onError={handleMapError}
                  />
                </div>
              </>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorFinder;
