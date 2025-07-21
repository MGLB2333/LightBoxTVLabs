import React from 'react';
import { Bot } from 'lucide-react';

const AIBannerButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center gap-2 text-sm"
    type="button"
  >
    <Bot className="w-3 h-3" />
    LightBoxTV AI Analyst
  </button>
);

export default AIBannerButton; 