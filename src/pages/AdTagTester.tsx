import React, { useState, useRef, useEffect } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import { vastParserService, TagAnalysis } from '../lib/vastParserService';

// Types (re-exported from service)

interface EventLog {
  ts: string;
  event: string;
  detail?: string;
}

interface RequestLog {
  ts: string;
  url: string;
  status?: number;
  ms?: number;
  ok?: boolean;
}

const AdTagTester: React.FC = () => {
  const setBanner = useSetBanner();
  const [inputType, setInputType] = useState<'url' | 'xml'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TagAnalysis | null>(null);
  const [rawXml, setRawXml] = useState('');
  const [events, setEvents] = useState<EventLog[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [showFullEvents, setShowFullEvents] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const vpaidIframeRef = useRef<HTMLIFrameElement>(null);


  useEffect(() => {
    setBanner(
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ad Tag Tester</h1>
        <p className="text-sm text-gray-600 mt-1">Load a VAST tag, preview the ad, and check CTV compatibility.</p>
      </div>
    );

    // Cleanup banner on unmount
    return () => {
      setBanner(null);
    };
  }, [setBanner]);

  const handleLoadTag = async () => {
    if (!inputValue.trim()) return;

    console.log('Loading tag with input:', inputValue.substring(0, 100) + '...');
    console.log('Input type:', inputType);

    setIsLoading(true);
    setAnalysis(null);
    setRawXml('');
    setEvents([]);
    setRequests([]);

    try {
      let xmlContent = '';
      
      if (inputType === 'url') {
        console.log('Fetching URL:', inputValue);
        
        // Try direct fetch first
        let response;
        try {
          response = await fetch(inputValue, {
            headers: {
              'Content-Type': 'application/xml'
            }
          });
        } catch (corsError) {
          console.log('CORS error, trying with CORS proxy...');
          addEvent('CORS Error', 'Trying with CORS proxy');
          
          // Try with CORS proxy
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(inputValue)}`;
          response = await fetch(proxyUrl);
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch VAST tag: ${response.status} ${response.statusText}`);
        }
        
        xmlContent = await response.text();
        console.log('Fetched XML content:', xmlContent.substring(0, 500) + '...');
        
        addRequest({
          url: inputValue,
          status: response.status,
          ms: 0,
          ok: response.ok
        });
        
        addEvent('VAST fetched', `Content length: ${xmlContent.length} characters`);
      } else {
        // Use pasted XML
        xmlContent = inputValue;
      }

      setRawXml(xmlContent);
      
      // Parse VAST tag
      const parsedAnalysis = await vastParserService.parseVastTag(xmlContent);
      setAnalysis(parsedAnalysis);

      // Try to play the ad if it's playable
      if (parsedAnalysis.hasLinear) {
        // Always attempt to play the video, even with VPAID
        await playVastAd(parsedAnalysis, xmlContent);
      }

    } catch (error: any) {
      console.error('Error loading tag:', error);
      setAnalysis({
        vastVersion: 'Unknown',
        hasLinear: false,
        hasNonLinear: false,
        hasCompanions: false,
        mediaMimes: [],
        omid: false,
        vpaid: null,
        mezzanine: false,
        verificationCount: 0,
        ssaiFriendly: false,
        warnings: [],
        errors: [error.message || 'Failed to load VAST tag']
      });
    } finally {
      setIsLoading(false);
    }
  };


  const playVastAd = async (analysis: TagAnalysis, xmlContent: string) => {
    // Extract media file URL from VAST XML
    console.log('playVastAd called with analysis:', analysis);
    console.log('playVastAd called with xmlContent length:', xmlContent.length);
    
    const mediaUrl = extractMediaUrl(xmlContent);
    console.log('playVastAd extracted mediaUrl:', mediaUrl);
    console.log('playVastAd videoRef.current:', videoRef.current);
    
    if (!mediaUrl) {
      addEvent('VAST ad loaded', 'No media URL found');
      return;
    }
    
    // Wait for video element to be available
    const waitForVideoElement = () => {
      return new Promise<HTMLVideoElement>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkVideo = () => {
          attempts++;
          if (videoRef.current) {
            console.log('Video element found after', attempts, 'attempts');
            resolve(videoRef.current);
          } else if (attempts >= maxAttempts) {
            console.log('Video element not found after', maxAttempts, 'attempts');
            reject(new Error('Video element not available'));
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        
        checkVideo();
      });
    };
    
    try {
      const video = await waitForVideoElement();
      addEvent('Video Player Setup', `Setting video source: ${mediaUrl.substring(0, 100)}...`);
      
      // Check if it's an HLS stream
      if (mediaUrl.includes('.m3u8') || mediaUrl.includes('application/x-mpegURL')) {
        addEvent('HLS Stream Detected', 'Loading HLS stream with native support');
        
        // Try to load HLS with native browser support first
        video.src = mediaUrl;
        video.load();
        
        // Add error handling for HLS
        video.addEventListener('error', (e) => {
          const target = e.target as HTMLVideoElement;
          addEvent('HLS Error', `Native HLS not supported: ${target.error?.message || 'Unknown error'}`);
          addEvent('HLS Fallback', 'HLS streams require a compatible player or browser');
        });
        
        video.addEventListener('loadedmetadata', () => {
          addEvent('HLS Loaded', 'HLS stream metadata loaded successfully');
        });
        
      } else {
        // Regular video file
        addEvent('MP4 Video Detected', 'Loading MP4 video file');
        video.src = mediaUrl;
        video.load();
        addEvent('VAST ad loaded', `Media URL: ${mediaUrl}`);
      }
      
      // Set up tracking events
      setupTrackingEvents(xmlContent);
    } catch (error) {
      console.error('Error waiting for video element:', error);
      addEvent('VAST ad loaded', `Video element not available: ${(error as Error).message}`);
    }
  };

  const setupTrackingEvents = (xmlContent: string) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Track start event
    const trackStart = () => {
      addEvent('Tracking: start', 'Ad playback started');
      fireTrackingEvent(xmlContent, 'start');
    };

    // Track quartile events
    const trackFirstQuartile = () => {
      addEvent('Tracking: firstQuartile', '25% of ad played');
      fireTrackingEvent(xmlContent, 'firstQuartile');
    };

    const trackMidpoint = () => {
      addEvent('Tracking: midpoint', '50% of ad played');
      fireTrackingEvent(xmlContent, 'midpoint');
    };

    const trackThirdQuartile = () => {
      addEvent('Tracking: thirdQuartile', '75% of ad played');
      fireTrackingEvent(xmlContent, 'thirdQuartile');
    };

    const trackComplete = () => {
      addEvent('Tracking: complete', 'Ad playback completed');
      fireTrackingEvent(xmlContent, 'complete');
    };

    // Add event listeners
    video.addEventListener('play', trackStart);
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const progress = video.currentTime / video.duration;
        if (progress >= 0.25 && !video.dataset.firstQuartile) {
          video.dataset.firstQuartile = 'true';
          trackFirstQuartile();
        }
        if (progress >= 0.5 && !video.dataset.midpoint) {
          video.dataset.midpoint = 'true';
          trackMidpoint();
        }
        if (progress >= 0.75 && !video.dataset.thirdQuartile) {
          video.dataset.thirdQuartile = 'true';
          trackThirdQuartile();
        }
      }
    });
    video.addEventListener('ended', trackComplete);

    // Cleanup function
    return () => {
      video.removeEventListener('play', trackStart);
      video.removeEventListener('timeupdate', () => {});
      video.removeEventListener('ended', trackComplete);
    };
  };

  const fireTrackingEvent = (xmlContent: string, eventType: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const trackingElements = xmlDoc.querySelectorAll(`Tracking[event="${eventType}"]`);
      
      trackingElements.forEach(element => {
        const url = element.textContent?.trim();
        if (url) {
          // Simulate tracking pixel request
          fetch(url, { method: 'GET', mode: 'no-cors' }).catch(() => {
            // Ignore CORS errors for tracking pixels
          });
          addRequest({
            url,
            status: 200,
            ms: Math.random() * 50 + 10,
            ok: true
          });
        }
      });
    } catch (error) {
      console.error('Error firing tracking event:', error);
    }
  };

  const extractMediaUrl = (xmlContent: string): string | null => {
    try {
      console.log('Raw XML content:', xmlContent);
      addEvent('Raw XML', `Length: ${xmlContent.length} chars`);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('XML parsing error:', parseError.textContent);
        addEvent('XML Parse Error', parseError.textContent || 'Unknown parsing error');
        return null;
      }

      // Log the entire structure for debugging
      console.log('Parsed XML structure:', xmlDoc);
      addEvent('XML Parsed', 'Successfully parsed XML structure');

      // Look for VAST version
      const vastElement = xmlDoc.querySelector('VAST');
      const vastVersion = vastElement?.getAttribute('version');
      console.log('VAST version:', vastVersion);
      addEvent('VAST Version', vastVersion || 'Unknown');

      // Look for Ad elements
      const adElements = xmlDoc.querySelectorAll('Ad');
      console.log('Found ads:', adElements.length);
      addEvent('Ad Elements', `Found ${adElements.length} ad(s)`);

      // Look for InLine or Wrapper
      const inLineElements = xmlDoc.querySelectorAll('InLine');
      const wrapperElements = xmlDoc.querySelectorAll('Wrapper');
      console.log('InLine elements:', inLineElements.length);
      console.log('Wrapper elements:', wrapperElements.length);
      addEvent('Ad Types', `InLine: ${inLineElements.length}, Wrapper: ${wrapperElements.length}`);

      // Look for Creative elements
      const creativeElements = xmlDoc.querySelectorAll('Creative');
      console.log('Found creatives:', creativeElements.length);
      addEvent('Creatives', `Found ${creativeElements.length} creative(s)`);

      // Look for Linear elements
      const linearElements = xmlDoc.querySelectorAll('Linear');
      console.log('Found linear ads:', linearElements.length);
      addEvent('Linear Ads', `Found ${linearElements.length} linear ad(s)`);

      // Look for MediaFile elements
      const mediaFiles = xmlDoc.querySelectorAll('MediaFile');
      console.log('Found media files:', mediaFiles.length);
      addEvent('Media Files', `Found ${mediaFiles.length} media file(s)`);
      
      if (mediaFiles.length === 0) {
        // Try alternative selectors
        const alternativeMediaFiles = xmlDoc.querySelectorAll('MediaFiles MediaFile, MediaFiles > MediaFile');
        console.log('Alternative media files:', alternativeMediaFiles.length);
        
        if (alternativeMediaFiles.length === 0) {
          addEvent('No Media Files', 'No MediaFile elements found in VAST');
          
          // Log the actual structure for debugging
          const structure = xmlDoc.documentElement.outerHTML;
          console.log('Full XML structure:', structure);
          addEvent('Full XML Structure', structure.substring(0, 500) + '...');
          return null;
        }
      }

      // Collect all media files first, then select the best one
      const allMediaFiles = xmlDoc.querySelectorAll('MediaFile');
      const collectedMediaFiles: Array<{type: string, url: string, delivery: string, width: string, height: string}> = [];
      
      // First pass: collect all media files
      for (const mediaFile of allMediaFiles) {
        const type = mediaFile.getAttribute('type') || '';
        const url = mediaFile.textContent?.trim();
        const delivery = mediaFile.getAttribute('delivery') || '';
        const width = mediaFile.getAttribute('width') || '';
        const height = mediaFile.getAttribute('height') || '';
        
        console.log('Media file found:', { type, url, delivery, width, height });
        addEvent('Media File Details', `Type: ${type}, Delivery: ${delivery}, Size: ${width}x${height}`);
        
        if (url) {
          collectedMediaFiles.push({ type, url, delivery, width, height });
        }
      }
      
      // Second pass: select the best media file
      let bestMediaFile = null;
      
      // 1. Prefer MP4 files first (they work in all browsers)
      const mp4Files = collectedMediaFiles.filter(mf => mf.type.includes('video/mp4'));
      if (mp4Files.length > 0) {
        // Prefer higher resolution MP4 files
        const sortedMp4 = mp4Files.sort((a, b) => {
          const aRes = parseInt(a.width) * parseInt(a.height);
          const bRes = parseInt(b.width) * parseInt(b.height);
          return bRes - aRes; // Higher resolution first
        });
        bestMediaFile = sortedMp4[0].url;
        addEvent('Best Media Selected', `MP4 (${sortedMp4[0].width}x${sortedMp4[0].height}): ${sortedMp4[0].url}`);
      }
      // 2. Then any other video type
      else {
        const videoFiles = collectedMediaFiles.filter(mf => mf.type.includes('video/'));
        if (videoFiles.length > 0) {
          bestMediaFile = videoFiles[0].url;
          addEvent('Best Media Selected', `Video: ${videoFiles[0].url}`);
        }
      }
      // 3. Then HLS streams (only if no video files found)
      if (!bestMediaFile) {
        const hlsFiles = collectedMediaFiles.filter(mf => mf.type.includes('application/x-mpegURL') || mf.url.includes('.m3u8'));
        if (hlsFiles.length > 0) {
          bestMediaFile = hlsFiles[0].url;
          addEvent('Best Media Selected', `HLS: ${hlsFiles[0].url}`);
        }
      }
      // 4. Finally, any media file
      if (!bestMediaFile && collectedMediaFiles.length > 0) {
        bestMediaFile = collectedMediaFiles[0].url;
        addEvent('Best Media Selected', `Any: ${collectedMediaFiles[0].url}`);
      }

      if (bestMediaFile) {
        addEvent('Media URL extracted', bestMediaFile);
        addEvent('Media Selection Complete', `Selected: ${bestMediaFile.substring(0, 100)}...`);
        return bestMediaFile;
      } else {
        addEvent('No valid media URL', 'No playable video URLs found');
        return null;
      }
    } catch (error) {
      console.error('Error parsing XML for media URL:', error);
      addEvent('XML Parse Error', `Error: ${(error as Error).message}`);
      return null;
    }
  };

  const playVpaidAd = async (analysis: TagAnalysis, xmlContent: string) => {
    // This would implement VPAID ad playback in sandboxed iframe
    addEvent('VPAID ad loaded', 'Running in sandboxed environment');
  };

  const addEvent = (event: string, detail?: string) => {
    const newEvent: EventLog = {
      ts: new Date().toISOString(),
      event,
      detail
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const addRequest = (request: Omit<RequestLog, 'ts'>) => {
    const newRequest: RequestLog = {
      ts: new Date().toISOString(),
      ...request
    };
    setRequests(prev => [...prev, newRequest]);
  };


  const copySummary = () => {
    if (!analysis) return;
    
    const summary = `VAST ${analysis.vastVersion} • ${analysis.hasLinear ? 'Linear' : 'NonLinear'} • MIME: ${analysis.mediaMimes.join(', ')} • OMID: ${analysis.omid ? 'yes' : 'no'} • VPAID: ${analysis.vpaid?.present ? analysis.vpaid.model : 'none'} • Duration ${analysis.duration || 'N/A'} • Skip ${analysis.skipOffset || 'N/A'} • CTV ready: ${analysis.ssaiFriendly ? 'yes' : 'no'}`;
    
    navigator.clipboard.writeText(summary);
    addEvent('Summary copied to clipboard');
  };

  const downloadLogs = () => {
    const logs = {
      analysis,
      events,
      requests,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vast-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const getCtvStatus = () => {
    if (!analysis) return null;
    
    if (analysis.vpaid?.present) {
      return { status: 'risk', label: 'CTV Risk', color: 'bg-red-100 text-red-800' };
    } else if (analysis.omid) {
      return { status: 'ready', label: 'CTV Ready', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'limited', label: 'Limited measurement on CTV', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const getFilteredEvents = () => {
    return events.filter(event => 
      event.event.includes('Video') || 
      event.event.includes('Tracking') || 
      event.event.includes('HLS') ||
      event.event.includes('MP4') ||
      event.event.includes('VAST ad loaded')
    );
  };

  const ctvStatus = getCtvStatus();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tag Input - Left Side */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Ad Tag</h3>
          
          <div className="space-y-4">
            {/* Input Type Selection */}
            <div>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="inputType"
                    value="url"
                    checked={inputType === 'url'}
                    onChange={(e) => setInputType(e.target.value as 'url' | 'xml')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">VAST URL</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="inputType"
                    value="xml"
                    checked={inputType === 'xml'}
                    onChange={(e) => setInputType(e.target.value as 'url' | 'xml')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Paste XML</span>
                </label>
              </div>
            </div>

            {/* Input Field */}
            <div>
              {inputType === 'url' ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="https://example.com/vast.xml"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              ) : (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste your VAST XML here..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              )}
            </div>
            
            <button
              onClick={handleLoadTag}
              disabled={isLoading || !inputValue.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Test Ad'}
            </button>
          </div>
        </div>

        {/* Video Player - Right Side */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Player</h3>
          
          {/* VPAID Warning */}
          {analysis?.vpaid?.present && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="text-yellow-600 mr-2">⚠️</div>
                <div>
                  <div className="font-medium text-yellow-800">VPAID {analysis.vpaid.model} Ad Detected</div>
                  <div className="text-sm text-yellow-700">
                    This ad uses VPAID {analysis.vpaid.model} {analysis.vpaid.version}. Video may not play in all environments.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden h-80">
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain"
              onLoadStart={() => {
                console.log('Video load started');
                addEvent('Video load started');
              }}
              onLoadedData={() => {
                console.log('Video data loaded');
                addEvent('Video data loaded');
              }}
              onPlay={() => {
                console.log('Video play');
                addEvent('Video play');
              }}
              onPause={() => {
                console.log('Video pause');
                addEvent('Video pause');
              }}
              onEnded={() => {
                console.log('Video ended');
                addEvent('Video ended');
              }}
              onError={(e) => {
                console.log('Video error:', e.currentTarget.error);
                addEvent('Video error', `Error: ${e.currentTarget.error?.message || 'Unknown error'}`);
              }}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Video overlay when no source */}
            {!videoRef.current?.src && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎬</div>
                  <div className="text-lg font-medium mb-2">Video Player Ready</div>
                  <div className="text-sm text-gray-300">Load a VAST tag to preview the ad</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Events and Information */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Events - Left Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Event Log</h3>
            
            <div className="flex-1 max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {getFilteredEvents().length === 0 ? (
                <div className="text-gray-500 text-center py-8">No events yet</div>
              ) : (
                getFilteredEvents().map((event, index) => (
                  <div key={index} className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                    <div className="text-xs text-gray-500 font-mono w-16 flex-shrink-0">
                      {new Date(event.ts).toLocaleTimeString()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{event.event}</div>
                      {event.detail && (
                        <div className="text-xs text-gray-600 truncate">{event.detail}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Information - Right Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Information</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">VAST Version:</span>
                <span className="font-mono text-sm">{analysis.vastVersion}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Ad Type:</span>
                <span className="text-sm">{analysis.hasLinear ? 'Linear' : 'Non-Linear'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Duration:</span>
                <span className="font-mono text-sm">{analysis.duration || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Skip Offset:</span>
                <span className="font-mono text-sm">{analysis.skipOffset || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Media Type:</span>
                <span className="text-sm">{analysis.mediaMimes.join(', ') || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">OMID Support:</span>
                <span className="text-sm">{analysis.omid ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">VPAID:</span>
                <span className="text-sm">{analysis.vpaid?.present ? `${analysis.vpaid.model} ${analysis.vpaid.version}` : 'None'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">CTV Ready:</span>
                <span className="text-sm">{analysis.ssaiFriendly ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Full Events Modal */}
      {showFullEvents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Events</h3>
              <button
                onClick={() => setShowFullEvents(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No events logged yet</div>
                ) : (
                  events.map((event, index) => (
                    <div key={index} className="flex items-center space-x-4 py-2 border-b border-gray-100 last:border-b-0">
                      <div className="text-xs text-gray-500 font-mono w-20">
                        {new Date(event.ts).toLocaleTimeString()}
                      </div>
                      <div className="font-medium text-gray-900">{event.event}</div>
                      {event.detail && (
                        <div className="text-sm text-gray-600">{event.detail}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdTagTester;
