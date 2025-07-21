import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleAdsService } from '../lib/googleAdsService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const GoogleAdsCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('OAuth Callback Debug:', { code: !!code, state: !!state, error });

        if (error) {
          console.error('OAuth Error:', error);
          setStatus('error');
          setMessage(`Authorization error: ${error}`);
          return;
        }

        if (!code || !state) {
          console.error('Missing parameters:', { code: !!code, state: !!state });
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          return;
        }

        console.log('Starting OAuth callback handling...');
        
        // Handle the OAuth callback
        await googleAdsService.handleOAuthCallback(code, state);
        
        console.log('OAuth callback successful');
        setStatus('success');
        setMessage('Google Ads account connected successfully!');
        
        // Redirect back to integrations page after 2 seconds
        setTimeout(() => {
          navigate('/integrations');
        }, 2000);

      } catch (error) {
        console.error('Error handling Google Ads callback:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Google Ads</h2>
              <p className="text-gray-600">Please wait while we connect your account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to integrations page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => navigate('/integrations')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Integrations
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAdsCallback; 