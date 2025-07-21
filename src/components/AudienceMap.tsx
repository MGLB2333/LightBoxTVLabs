import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { cellToLatLng, latLngToCell, cellToBoundary } from 'h3-js';
import { supabase } from '../lib/supabase';
import { RealExperianService } from '../lib/realExperianService';
import LoadingSpinner from './LoadingSpinner';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeoData {
  geo: string;
  count: number;
}

interface GeoLookup {
  "Postcode District": string;
  "Latitude": number;
  "Longitude": number;
}

interface AudienceMapProps {
  h3Resolution: number;
  setH3Resolution: (resolution: number) => void;
}

const UK_BOUNDS = latLngBounds(
  [49.9, -8.2], // Southwest
  [60.9, 1.8]   // Northeast
);

const AudienceMap: React.FC<AudienceMapProps> = ({ h3Resolution, setH3Resolution }) => {
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeoData();
  }, [h3Resolution]);

  const fetchGeoData = async () => {
    try {
      setLoading(true);
      console.log('🗺️ Fetching geo data for map...');
      
      // Use the RealExperianService to get aggregated postcode data
      const audienceData = await RealExperianService.getGeographicAudienceData();
      const postcodePerformance = audienceData.postcodePerformance;
      
      console.log(`📊 Got ${postcodePerformance.length} postcode districts from service`);
      
      if (postcodePerformance.length === 0) {
        console.log('No postcode data available');
        setLoading(false);
        return;
      }

      // Get unique postcodes from the performance data
      const uniquePostcodes = postcodePerformance.map(p => p.postcodeDistrict);
      console.log('Unique postcodes from service:', uniquePostcodes.length);

      // Fetch geo coordinates for these postcodes
      const { data: geoLookupData, error: geoError } = await supabase
        .from('Geo_lookup')
        .select('"Postcode District", "Latitude", "Longitude"')
        .in('"Postcode District"', uniquePostcodes)
        .not('"Latitude"', 'is', null)
        .not('"Longitude"', 'is', null);

      if (geoError) {
        console.error('Error fetching geo lookup:', geoError);
        return;
      }

      console.log('Geo lookup matches found:', geoLookupData?.length);

      // Create a map for quick lookup
      const geoLookupMap = new Map<string, { lat: number; lng: number }>();
      geoLookupData?.forEach((item: GeoLookup) => {
        geoLookupMap.set(item["Postcode District"], {
          lat: item.Latitude,
          lng: item.Longitude
        });
      });

      // Create a map of postcode to total events (impressions + completions)
      const postcodeEventMap = new Map<string, number>();
      postcodePerformance.forEach(postcode => {
        postcodeEventMap.set(postcode.postcodeDistrict, postcode.impressions + postcode.completions);
      });

      // Process geo data and aggregate by H3 hexagon
      const geoCounts: Record<string, number> = {};
      
      postcodePerformance.forEach(postcode => {
        const coords = geoLookupMap.get(postcode.postcodeDistrict);
        if (coords) {
          try {
            // Convert to H3 hexagon
            const h3Index = latLngToCell(coords.lat, coords.lng, h3Resolution);
            const totalEvents = postcode.impressions + postcode.completions;
            geoCounts[h3Index] = (geoCounts[h3Index] || 0) + totalEvents;
          } catch (err) {
            console.warn('Error processing geo data:', postcode.postcodeDistrict, err);
          }
        }
      });

      // Convert to array format
      const geoDataArray = Object.entries(geoCounts).map(([geo, count]) => ({
        geo,
        count
      }));

      console.log('Processed geo data:', geoDataArray.length, 'hexagons');
      console.log('Sample hexagons:', geoDataArray.slice(0, 5));
      console.log('Total events across all hexagons:', geoDataArray.reduce((sum, hex) => sum + hex.count, 0));

      setGeoData(geoDataArray);
    } catch (error) {
      console.error('Error processing geo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHexagonColor = (count: number) => {
    // Color scale based on count using primary color #00b4e7
    if (count > 1000) return '#0077b3'; // Dark shade of primary
    if (count > 500) return '#0094d9';  // Medium-dark shade
    if (count > 200) return '#00b4e7';  // Primary color (medium)
    if (count > 100) return '#33c3eb';  // Light shade
    if (count > 50) return '#66d2ef';   // Lighter shade
    return '#99e1f3'; // Lightest shade
  };

  const getHexagonOpacity = (count: number) => {
    // Opacity based on count - increased for visibility
    if (count > 1000) return 0.9;
    if (count > 500) return 0.8;
    if (count > 200) return 0.7;
    if (count > 100) return 0.6;
    if (count > 50) return 0.5;
    return 0.4; // Increased from 0.3 for better visibility
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingSpinner text="Loading map data..." size="md" />
      </div>
    );
  }

  console.log('Rendering map with', geoData.length, 'hexagons');

  return (
    <div className="w-full">
      <div className="h-[580px] rounded-lg overflow-hidden border border-gray-200 relative">
        {/* Hex Zoom Controls - Fixed at top center */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-white border border-gray-300 rounded-md p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Hex Size:</label>
            <div className="flex">
              {[3, 4, 5, 6, 7, 8].map((resolution, index) => (
                <button
                  key={resolution}
                  onClick={() => setH3Resolution(resolution)}
                  className={`px-2 py-1 text-xs transition-colors ${
                    h3Resolution === resolution
                      ? 'bg-[#02b3e5] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${
                    index === 0 ? 'rounded-l-md' : ''
                  } ${
                    index === 5 ? 'rounded-r-md' : ''
                  } ${
                    index > 0 ? 'border-l border-gray-300' : ''
                  }`}
                >
                  {resolution}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Full Screen Button */}
        <button
          onClick={() => {
            const mapContainer = document.querySelector('.leaflet-container');
            if (mapContainer) {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                mapContainer.requestFullscreen();
              }
            }
          }}
          className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md p-2 shadow-sm transition-colors"
          title="Toggle full screen"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        
        <div className="w-full h-full overflow-hidden">
          <MapContainer
            center={[54.5, -2] as [number, number]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            maxBounds={UK_BOUNDS}
            maxBoundsViscosity={1.0}
          >
            {/* Carto Grey UK Map */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={19}
            />
            
            {/* H3 Hexagons */}
            {geoData.map((item) => {
              try {
                const boundary = cellToBoundary(item.geo, true);
                const positions = boundary.map(([lng, lat]) => [lat, lng] as [number, number]);
                
                return (
                  <Polygon
                    key={item.geo}
                    positions={positions}
                    pathOptions={{
                      fillColor: getHexagonColor(item.count),
                      color: 'transparent', // No border
                      weight: 0, // No border weight
                      opacity: 0, // No border opacity
                      fillOpacity: getHexagonOpacity(item.count),
                    }}
                    eventHandlers={{
                      mouseover: (e: LeafletMouseEvent) => {
                        const layer = e.target;
                        layer.setStyle({
                          weight: 0,
                          fillOpacity: 0.9,
                        });
                      },
                      mouseout: (e: LeafletMouseEvent) => {
                        const layer = e.target;
                        layer.setStyle({
                          weight: 0,
                          fillOpacity: getHexagonOpacity(item.count),
                        });
                      },
                    }}
                  />
                );
              } catch (error) {
                console.warn('Error rendering hexagon:', item.geo, error);
                return null;
              }
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default AudienceMap; 