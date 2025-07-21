import React, { useState, useEffect } from 'react';
import { 
  Bot, MessageSquare, Lightbulb, X, Send, 
  TrendingUp, Target, Users, BarChart3, Globe,
  Play, Monitor, Youtube, Tv, Zap
} from 'lucide-react';

interface AIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'chat' | 'recommendations';
}

const AIDrawer: React.FC<AIDrawerProps> = ({ isOpen, onClose, initialTab = 'chat' }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'recommendations'>(initialTab);
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', content: 'Hello! I\'m your AI assistant. How can I help you with your TV advertising strategy today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  const aiRecommendations = [
    {
      id: 1,
      title: 'Audience Optimization',
      description: 'Optimize your target audience for Love Island based on recent viewing patterns',
      icon: Target,
      category: 'Audience',
      priority: 'High'
    },
    {
      id: 2,
      title: 'Competitor Analysis',
      description: 'Analyze Nike\'s TV presence and identify opportunities for your brand',
      icon: TrendingUp,
      category: 'Brand',
      priority: 'Medium'
    },
    {
      id: 3,
      title: 'Budget Allocation',
      description: 'Get recommendations for optimal budget split across Linear TV and CTV',
      icon: BarChart3,
      category: 'Planning',
      priority: 'High'
    },
    {
      id: 4,
      title: 'Show Selection',
      description: 'Find shows with high overlap with your target demographic',
      icon: Tv,
      category: 'Content',
      priority: 'Medium'
    },
    {
      id: 5,
      title: 'Platform Mix',
      description: 'Optimize your media mix between Linear TV, CTV, and YouTube',
      icon: Globe,
      category: 'Strategy',
      priority: 'High'
    },
    {
      id: 6,
      title: 'Creative Insights',
      description: 'Get recommendations for ad creative based on show context',
      icon: Lightbulb,
      category: 'Creative',
      priority: 'Low'
    }
  ];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: inputMessage
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: 'I understand you\'re asking about TV advertising. Let me analyze the data and provide you with some insights...'
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[560px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[9999] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'text-pink-600 border-b-2 border-pink-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Recommendations
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-pink-600 border-b-2 border-pink-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask me anything about TV advertising..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center gap-1"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="p-4 overflow-y-auto h-full">
              <div className="space-y-4">
                {aiRecommendations.map((recommendation) => {
                  const IconComponent = recommendation.icon;
                  return (
                    <div
                      key={recommendation.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-pink-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-4 h-4 text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 text-sm">
                              {recommendation.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recommendation.priority === 'High'
                                ? 'bg-red-100 text-red-800'
                                : recommendation.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {recommendation.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {recommendation.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {recommendation.category}
                            </span>
                            <button className="text-xs text-pink-600 hover:text-pink-700 font-medium">
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIDrawer; 