import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, X, Send, User } from 'lucide-react';
import { agentService } from '../../lib/agents/AgentService';
import type { AgentMessage } from '../../lib/agents/types';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, initialQuery }) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Initialize with welcome message
      const welcomeMessage: AgentMessage = {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your LightBoxTV AI Analyst. I can help you with analytics, audience insights, and campaign optimization. What would you like to know?',
        timestamp: new Date(),
        agentId: 'master'
      };
      setMessages([welcomeMessage]);

      // Load suggestions
      loadSuggestions();

      // If there's an initial query, set it in the input and send it
      if (initialQuery && initialQuery.trim()) {
        setInputText(initialQuery);
        // We'll send the message after a short delay to ensure the drawer is fully loaded
        setTimeout(() => {
          handleSendMessage(initialQuery);
        }, 100);
      }
    }
  }, [isOpen, initialQuery]);

  const loadSuggestions = async () => {
    try {
      const context = {
        currentPage: window.location.pathname,
        // Add user context from your auth system
      };
      const agentSuggestions = await agentService.getAgentSuggestions(context);
      setSuggestions(agentSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Create context based on current page and user state
      const context = {
        currentPage: window.location.pathname,
        // Add user context from your auth system
        // userId: currentUser?.id,
        // organizationId: currentOrg?.id,
        // filters: currentFilters
      };

      const response = await agentService.processMessage(messageContent, context);

      const aiMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        agentId: response.agentId || 'master',
        agentName: response.agentName
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        agentId: 'master'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  if (!isOpen) return null;

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative w-[500px] h-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-gray-900">LightBoxTV AI Analyst</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' && message.agentName && (
                  <div className="mb-2">
                    <span className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full font-medium">
                      {message.agentName}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && (
                    <Bot className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="text-sm">{message.content}</div>
                  {message.role === 'user' && (
                    <User className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-pink-500" />
                  <div className="text-sm">AI is thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render using portal to avoid Layout container padding
  return createPortal(drawerContent, document.body);
};

export default AIChatDrawer; 