import React, { useState } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import { Bot } from 'lucide-react';

const LightBoxTVAI: React.FC = () => {
  const setBanner = useSetBanner();
  const [input, setInput] = useState('');
  // Optionally, you could wire this up to the AI chat logic

  React.useEffect(() => {
    setBanner(
      <div className="w-full flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">LightBoxTV AI</h1>
        </div>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner]);

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-4 text-center">Ask anything about your campaigns, plans, account, or more.</h2>
      <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center">
        <textarea
          className="w-full h-32 border border-gray-300 rounded-lg p-4 text-lg focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4 resize-none"
          placeholder="Type your question..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          className="px-6 py-3 bg-pink-500 text-white rounded-md text-lg font-semibold hover:bg-pink-600 transition-colors"
        >
          Ask AI
        </button>
      </div>
    </div>
  );
};

export default LightBoxTVAI; 