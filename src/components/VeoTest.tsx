import React, { useState } from 'react';
import { veoService } from '../lib/veoService';
import { Loader2, Play, CheckCircle, XCircle } from 'lucide-react';

const VeoTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    videoUrl: string;
    jobId: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testVeo = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const testPrompt = "Create a short video showing a modern smartphone with sleek design, highlighting its camera features and user interface. The video should be professional and commercial style.";
      
      const response = await veoService.generateVideo(testPrompt, {
        aspectRatio: '16:9',
        duration: 6,
        style: 'commercial'
      });

      setResult(response);
      console.log('Veo Response:', response);
    } catch (err: any) {
      setError(err.message);
      console.error('Veo Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-sm">
      <h3 className="text-lg font-semibold mb-2">Veo 2 Test</h3>
      
      <button
        onClick={testVeo}
        disabled={isGenerating}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Test Veo 2
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-800">Video Generation Started!</span>
          </div>
          <div className="mt-1 text-xs text-green-700">
            Job ID: {result.jobId}
          </div>
          <div className="mt-1 text-xs text-green-600">
            Status: {result.status} - Check progress in main UI
          </div>
        </div>
      )}
    </div>
  );
};

export default VeoTest;
