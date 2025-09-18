import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Package, 
  Upload, 
  FileText, 
  Image, 
  Play, 
  Download, 
  Eye,
  Plus,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  Loader2,
  AlertCircle,
  Settings,
  Palette,
  Type,
  Volume2,
  VolumeX,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Pause,
  Maximize,
  X
} from 'lucide-react';
import { useSetBanner } from '../components/layout/BannerContext';
import { googleAIService, type IngestResult, type VideoGenerationRequest, type CreativeBrief } from '../lib/googleAIService';

// Types
type AdSession = {
  id: string;
  source: { type: 'url'|'upload'|'paragraph'; value: string; preview?: SourcePreview };
  brand: { logoUrl?: string; primaryHex?: string; secondaryHex?: string; tone?: string; compliance?: string };
  brief?: CreativeBrief;
  concepts?: Concept[];
  scripts?: ScriptVariant[];
  assets?: { images: string[]; endCard?: string; audio?: { mode: 'native'|'mute'; voUrl?: string } };
  jobs?: GenerationJob[];
  outputs?: GeneratedAsset[];
  packageId?: string;
};

type SourcePreview = {
  title: string;
  summary: string;
  bullets: string[];
};

type Concept = {
  id: string;
  hook: string;
  headline: string;
  rationale: string;
  selected: boolean;
};

type ScriptVariant = {
  id: string;
  preset: '6s'|'10-15s'|'UGC'|'Premium';
  beats: { t: number; action: string; camera?: string; super?: string; notes?: string }[];
};

type GenerationJob = {
  id: string;
  status: 'queued'|'running'|'complete'|'failed';
  params: { aspectRatios: string[]; durationSec: number; variants: number; guidance?: number };
  outputs?: GeneratedAsset[];
  createdAt: string;
};

type GeneratedAsset = {
  id: string;
  kind: 'video'|'srt'|'json';
  url: string;
  meta?: Record<string, any>;
};

const AdGenerator: React.FC = () => {
  const [adSession, setAdSession] = useState<AdSession>({
    id: `session_${Date.now()}`,
    source: { type: 'paragraph', value: '' },
    brand: {}
  });
  const [inputValue, setInputValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showParagraph, setShowParagraph] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoCarousel, setShowVideoCarousel] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [showBriefPopup, setShowBriefPopup] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<CreativeBrief | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerationJob, setVideoGenerationJob] = useState<{
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    progress?: number;
  } | null>(null);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setBanner = useSetBanner();

  // Generate Veo prompt from brief
  const generateVideo = async () => {
    if (!generatedBrief) return;

    setIsGeneratingVideo(true);
    setError(null);

    try {
      const prompt = generateVeoPrompt(generatedBrief);
      const result = await veoService.generateVideo(prompt, {
        aspectRatio: '16:9',
        duration: 6,
        style: 'commercial'
      });
      
      setVideoGenerationJob({
        jobId: result.jobId,
        status: result.status,
        videoUrl: result.videoUrl,
        progress: 0
      });

      // Start polling for status updates
      pollVideoStatus(result.jobId);

    } catch (error: any) {
      console.error('Error generating video:', error);
      setError('Failed to generate video. Please try again.');
      setIsGeneratingVideo(false);
    }
  };

  const pollVideoStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await veoService.checkVideoStatus(jobId);
        
        setVideoGenerationJob(prev => prev ? {
          ...prev,
          status: status.status,
          videoUrl: status.videoUrl,
          progress: status.progress
        } : null);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          setIsGeneratingVideo(false);
          
          if (status.status === 'completed' && status.videoUrl) {
            setCurrentVideo(status.videoUrl);
            setGeneratedVideos(prev => [...prev, status.videoUrl!]);
          }
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        clearInterval(pollInterval);
        setIsGeneratingVideo(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  const generateVeoPrompt = (brief: CreativeBrief): string => {
    return `Create a short video advertisement (6-15 seconds) with the following specifications:

**Product Summary:** ${brief.productSummary}

**Key Benefit:** ${brief.keyBenefit}

**Target Audience:** ${brief.targetAudience}

**Proof Points:** ${brief.proofPoints.join(', ')}

${brief.offer ? `**Special Offer:** ${brief.offer}` : ''}

**Primary Call to Action:** ${brief.primaryCTA}

**Tone:** ${brief.tone}

**Video Requirements:**
- Duration: 6-15 seconds
- Aspect Ratio: 9:16 (vertical) for mobile/social
- Style: ${brief.tone} tone
- Focus: Show the product in action with clear value proposition
- End with strong call to action

**Visual Guidelines:**
- High-quality, professional footage
- Clear product visibility
- Engaging visuals that match the ${brief.tone} tone
- Smooth transitions and pacing
- Text overlays for key benefits if needed

**Audio Guidelines:**
- Upbeat, professional music
- Clear voiceover if needed
- Sound effects that enhance the message

Create a compelling video that drives action and clearly communicates the value proposition to the target audience.`;
  };

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Generator</h1>
          <p className="text-sm text-gray-600 mt-1">Turn a website or deck into a short video ad with Veo 3.</p>
        </div>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner]);


  const handleGenerate = async () => {
    if (!inputValue.trim()) return;
    
    // Show restriction modal instead of generating
    setShowRestrictionModal(true);
  };

  const handleFileUpload = (file: File) => {
    if (file.type.includes('pdf') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
      setUploadedFile(file);
      setInputValue(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero TV Player */}
      <div className="relative">
        <div className="bg-black rounded-lg p-2 shadow-lg max-w-2xl mx-auto">
          <div className="relative bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
            {currentVideo && currentVideo !== 'error' ? (
              <div className="relative w-full h-full">
                {videoLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading video...</p>
                    </div>
                  </div>
                )}
                <video
                  className="w-full h-full object-cover rounded-lg"
                  controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedData={() => setVideoLoading(false)}
                  onError={(e) => {
                    console.error('Video error:', e);
                    setVideoLoading(false);
                    setCurrentVideo('error');
                  }}
                >
                  <source src={currentVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : currentVideo === 'error' ? (
              <div className="text-center text-red-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <p className="text-sm">Video failed to load. Please try generating again.</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <PlayCircle className="w-12 h-12 mx-auto mb-3" />
                <p className="text-sm">Your video will appear here after generation.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Icon Rail */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 space-y-2">
          {[
            { icon: Edit, label: 'Edit', disabled: !currentVideo },
            { icon: FileText, label: 'Script', disabled: !currentVideo },
            { icon: Image, label: 'Assets', disabled: !currentVideo },
            { icon: Download, label: 'Export', disabled: !currentVideo }
          ].map((item, index) => (
            <button
              key={index}
              disabled={item.disabled}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                item.disabled 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Primary Input Bar */}
      <div className="sticky top-4 z-10">
        <div 
          className="bg-white rounded-2xl border-2 border-gray-200 p-2 shadow-lg max-w-2xl mx-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputType === 'url' ? "Paste a website URL to analyze..." : "Describe your product or service..."}
                className="w-full px-4 py-3 text-lg border-0 focus:outline-none focus:ring-0"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!inputValue.trim() || isGenerating}
              className="px-6 py-3 bg-[#02b3e5] text-white rounded-xl hover:bg-[#02b3e5]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          
          {/* Input Type Toggle */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">Input type:</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inputType"
                    value="url"
                    checked={inputType === 'url'}
                    onChange={() => setInputType('url')}
                    className="text-[#02b3e5]"
                  />
                  URL
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inputType"
                    value="text"
                    checked={inputType === 'text'}
                    onChange={() => setInputType('text')}
                    className="text-[#02b3e5]"
                  />
                  Text Description
                </label>
              </div>
              
              {/* View Prompt Button */}
              {generatedBrief && !isGenerating && (
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="text-sm text-[#02b3e5] hover:text-[#02b3e5]/80 transition-colors underline font-medium"
                >
                  View Prompt
                </button>
              )}
            </div>
            
            {/* Quick Test Examples */}
            {!inputValue && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {(inputType === 'url' ? [
                    'https://www.apple.com',
                    'https://www.nike.com',
                    'https://www.tesla.com',
                    'https://www.spotify.com'
                  ] : [
                    'A tech startup building AI-powered productivity tools',
                    'An e-commerce store selling sustainable fashion',
                    'A fitness app for home workouts',
                    'A business consulting firm specializing in digital transformation'
                  ]).map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(example)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Progress Bar */}
      {isGenerating && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#02b3e5]" />
              <span className="text-sm font-medium text-gray-700">Generating your video ad...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#02b3e5] h-2 rounded-full transition-all duration-500" 
                style={{width: `${generationProgress}%`}}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{generationProgress}% complete</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => {
                  setError(null);
                  handleGenerate();
                }}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Carousel */}
      {showVideoCarousel && generatedVideos.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Videos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedVideos.map((videoUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <video
                    className="w-full h-full object-cover rounded-lg"
                    muted
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                  >
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                    <button 
                      onClick={() => setCurrentVideo(videoUrl)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Accordion */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">Advanced</span>
          {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showAdvanced && (
          <div className="px-6 pb-6 space-y-6">
            <div className="text-center text-gray-500 py-8">
              <p>Advanced settings coming soon...</p>
            </div>
          </div>
        )}
      </div>


      {/* Video Generation Status */}
      {videoGenerationJob && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Video Generation</h3>
            <span className={`text-xs px-2 py-1 rounded ${
              videoGenerationJob.status === 'completed' ? 'bg-green-100 text-green-800' :
              videoGenerationJob.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {videoGenerationJob.status}
            </span>
          </div>
          
          {videoGenerationJob.progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-[#02b3e5] h-2 rounded-full transition-all duration-300"
                style={{ width: `${videoGenerationJob.progress}%` }}
              ></div>
            </div>
          )}
          
          <p className="text-sm text-gray-600">
            {videoGenerationJob.status === 'pending' && 'Queued for processing...'}
            {videoGenerationJob.status === 'processing' && 'Generating your video...'}
            {videoGenerationJob.status === 'completed' && 'Video ready!'}
            {videoGenerationJob.status === 'failed' && 'Generation failed'}
          </p>
          
          {videoGenerationJob.videoUrl && (
            <div className="mt-3">
              <video 
                src={videoGenerationJob.videoUrl} 
                controls 
                className="w-full rounded"
              />
            </div>
          )}
        </div>
      )}

      {/* Veo Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Veo Video Generation Prompt</h2>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">This is the complete prompt that will be sent to Veo for video generation:</h3>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                    {generatedBrief ? generateVeoPrompt(generatedBrief) : 'No brief available'}
                  </pre>
                </div>

                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-700">Ready to send to Veo 3</span>
                  </div>
                  <span className="text-xs text-blue-600">
                    {generatedBrief ? generateVeoPrompt(generatedBrief).length : 0} characters
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPromptModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (generatedBrief) {
                        navigator.clipboard.writeText(generateVeoPrompt(generatedBrief));
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Copy Prompt
                  </button>
                </div>
                <button
                  onClick={generateVideo}
                  disabled={isGeneratingVideo || !generatedBrief}
                  className="px-6 py-2 bg-[#02b3e5] text-white rounded-lg hover:bg-[#02b3e5]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Generate Video with Veo 2
                    </>
              )}
            </button>
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="mt-2 p-2 bg-yellow-100 text-xs">
          Debug: showRestrictionModal = {showRestrictionModal.toString()}, inputValue = "{inputValue}"
        </div>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {showRestrictionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Restricted
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                This feature is currently restricted. Please contact your LightBox TV representative for access to the AI Ad Generator.
              </p>
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="w-full px-4 py-2 bg-[#02b3e5] text-white rounded-lg hover:bg-[#0288d1] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



export default AdGenerator;
