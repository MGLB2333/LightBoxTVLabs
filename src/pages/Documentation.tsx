import React, { useState } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import AIBannerButton from '../components/layout/AIBannerButton';
import AIChatDrawer from '../components/layout/AIChatDrawer';
import { FileText, Search, Download, Share2, BookOpen, Code, Database, Settings, HelpCircle, ChevronDown, ChevronRight, ExternalLink, Video, BarChart3, Users, Target, Zap } from 'lucide-react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';

const DOC_SECTIONS = [
  { 
    id: 'getting-started', 
    label: 'Getting Started',
    icon: BookOpen,
    subsections: [
      { id: 'quick-start', label: 'Quick Start Guide' },
      { id: 'account-setup', label: 'Account Setup' },
      { id: 'first-campaign', label: 'Your First Campaign' },
      { id: 'navigation', label: 'Platform Navigation' }
    ]
  },
  { 
    id: 'campaigns', 
    label: 'Campaigns',
    icon: Target,
    subsections: [
      { id: 'campaign-creation', label: 'Creating Campaigns' },
      { id: 'campaign-management', label: 'Managing Campaigns' },
      { id: 'campaign-analytics', label: 'Campaign Analytics' },
      { id: 'campaign-optimization', label: 'Campaign Optimization' }
    ]
  },
  { 
    id: 'analytics', 
    label: 'Analytics',
    icon: BarChart3,
    subsections: [
      { id: 'overview', label: 'Analytics Overview' },
      { id: 'audience-insights', label: 'Audience Insights' },
      { id: 'content-performance', label: 'Content Performance' },
      { id: 'supply-path', label: 'Supply Path Analysis' },
      { id: 'incremental-reach', label: 'Incremental Reach' }
    ]
  },
  { 
    id: 'audience-builder', 
    label: 'Audience Builder',
    icon: Users,
    subsections: [
      { id: 'audience-segments', label: 'Audience Segments' },
      { id: 'geographic-targeting', label: 'Geographic Targeting' },
      { id: 'ai-audience-builder', label: 'AI Audience Builder' },
      { id: 'audience-export', label: 'Exporting Audiences' }
    ]
  },
  { 
    id: 'integrations', 
    label: 'Integrations',
    icon: Settings,
    subsections: [
      { id: 'youtube-integration', label: 'YouTube Integration' },
      { id: 'tv-data-providers', label: 'TV Data Providers' },
      { id: 'google-ads', label: 'Google Ads' },
      { id: 'api-access', label: 'API Access' }
    ]
  },
  { 
    id: 'ai-features', 
    label: 'AI Features',
    icon: Zap,
    subsections: [
      { id: 'ai-assistant', label: 'AI Assistant' },
      { id: 'ai-recommendations', label: 'AI Recommendations' },
      { id: 'ai-audience-builder', label: 'AI Audience Builder' },
      { id: 'ai-campaign-optimization', label: 'AI Campaign Optimization' }
    ]
  },
  { 
    id: 'api-reference', 
    label: 'API Reference',
    icon: Code,
    subsections: [
      { id: 'authentication', label: 'Authentication' },
      { id: 'endpoints', label: 'API Endpoints' },
      { id: 'rate-limits', label: 'Rate Limits' },
      { id: 'webhooks', label: 'Webhooks' }
    ]
  },
  { 
    id: 'faq', 
    label: 'FAQ',
    icon: HelpCircle,
    subsections: [
      { id: 'general', label: 'General Questions' },
      { id: 'technical', label: 'Technical Issues' },
      { id: 'billing', label: 'Billing & Plans' },
      { id: 'support', label: 'Getting Support' }
    ]
  },
];

const SECTION_CONTENT: Record<string, React.ReactNode> = {
  // Getting Started
  'quick-start': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quick Start Guide</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">Welcome to LightBoxTV! This guide will help you get up and running in minutes.</p>
      </div>
      
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Account Setup</h3>
          <p className="text-gray-600 mb-3">Create your account and set up your organization.</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Sign up with your email address</li>
            <li>Verify your email account</li>
            <li>Create or join an organization</li>
            <li>Invite team members (optional)</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Connect Integrations</h3>
          <p className="text-gray-600 mb-3">Connect your data sources for richer insights.</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Connect YouTube channel for content analysis</li>
            <li>Connect TV data providers for audience insights</li>
            <li>Set up Google Ads integration for campaign data</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Create Your First Campaign</h3>
          <p className="text-gray-600 mb-3">Start building campaigns to reach your target audience.</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Navigate to the Campaigns section</li>
            <li>Click "Create New Campaign"</li>
            <li>Define your target audience</li>
            <li>Set your campaign parameters</li>
            <li>Review and launch</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  'account-setup': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Setup</h2>
      <p className="text-gray-600">Complete guide to setting up your LightBoxTV account and organization.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Account</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Email verification process</li>
            <li>Password security best practices</li>
            <li>Two-factor authentication setup</li>
            <li>Profile customization</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Setup</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Creating a new organization</li>
            <li>Inviting team members</li>
            <li>Setting user roles and permissions</li>
            <li>Organization settings management</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  // Campaigns
  'campaign-creation': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Creating Campaigns</h2>
      <p className="text-gray-600">Learn how to create effective TV and CTV campaigns in LightBoxTV.</p>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800"><strong>Pro Tip:</strong> Use the AI Audience Builder to automatically identify your best target audiences.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Basics</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Campaign naming conventions</li>
            <li>Setting campaign objectives</li>
            <li>Defining target audiences</li>
            <li>Budget allocation strategies</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Features</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Geographic targeting options</li>
            <li>Demographic targeting</li>
            <li>Behavioral targeting</li>
            <li>Cross-platform campaign coordination</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  // Analytics
  'overview': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
      <p className="text-gray-600">Comprehensive guide to understanding your campaign performance and audience insights.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Metrics</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Reach and frequency</li>
            <li>Audience engagement</li>
            <li>Cost per thousand (CPM)</li>
            <li>Return on ad spend (ROAS)</li>
            <li>Incremental reach analysis</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporting Tools</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Real-time dashboards</li>
            <li>Custom report builder</li>
            <li>Data export options</li>
            <li>Scheduled reports</li>
            <li>API data access</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  // Audience Builder
  'audience-segments': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Audience Segments</h2>
      <p className="text-gray-600">Create and manage audience segments for precise targeting.</p>
      
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800"><strong>New:</strong> AI-powered audience recommendations now available!</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Segment Types</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Demographic segments (age, gender, income)</li>
            <li>Geographic segments (postcode, region, city)</li>
            <li>Behavioral segments (purchase history, interests)</li>
            <li>Custom segments (first-party data)</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Segment Management</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Creating new segments</li>
            <li>Editing existing segments</li>
            <li>Segment overlap analysis</li>
            <li>Segment performance tracking</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  // AI Features
  'ai-assistant': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
      <p className="text-gray-600">Leverage AI to get insights, recommendations, and answers to your questions.</p>
      
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-800"><strong>AI Assistant:</strong> Ask me anything about your campaigns, audiences, or platform features!</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">What You Can Ask</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>"Show me my best performing campaigns"</li>
            <li>"What audiences should I target for my product?"</li>
            <li>"How can I optimize my campaign budget?"</li>
            <li>"Explain the incremental reach metric"</li>
            <li>"Help me create a new audience segment"</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Capabilities</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Natural language queries</li>
            <li>Data analysis and insights</li>
            <li>Campaign recommendations</li>
            <li>Audience suggestions</li>
            <li>Performance optimization tips</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  // API Reference
  'authentication': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">API Authentication</h2>
      <p className="text-gray-600">Learn how to authenticate with the LightBoxTV API.</p>
      
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">API Keys</h3>
          <p className="text-gray-600 mb-3">All API requests require authentication using your API key.</p>
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
            Authorization: Bearer YOUR_API_KEY
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Your API Key</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Navigate to your account settings</li>
            <li>Go to the API section</li>
            <li>Generate a new API key</li>
            <li>Copy and store it securely</li>
          </ol>
        </div>
      </div>
    </div>
  ),

  // FAQ
  'general': (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">General Questions</h2>
      <p className="text-gray-600">Common questions about LightBoxTV platform and features.</p>
      
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I reset my password?</h3>
          <p className="text-gray-600">Click the "Forgot Password" link on the login page and follow the instructions sent to your email.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I invite team members?</h3>
          <p className="text-gray-600">Go to your organization settings and use the "Invite Members" feature. You can invite by email or generate an invite link.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">What data sources do you support?</h3>
          <p className="text-gray-600">We support YouTube, major TV data providers, Google Ads, and custom data imports via our API.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I contact support?</h3>
          <p className="text-gray-600">You can reach our support team via email at support@lightboxtv.com or use the chat widget in the bottom right corner.</p>
        </div>
      </div>
    </div>
  ),
};

const Documentation: React.FC = () => {
  const setBanner = useSetBanner();
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const params = useParams();
  const section = params.section || 'quick-start';

  React.useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Documentation</h1>
              <p className="text-gray-600 mt-1 text-sm">Find guides, API references, and best practices for using the platform.</p>
            </div>
          </div>
          <AIBannerButton onClick={() => setIsChatDrawerOpen(true)} />
        </div>
      </div>
    );
    return () => setBanner(null);
  }, [section]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const filteredSections = DOC_SECTIONS.filter(section => 
    section.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections.some(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex w-full max-w-6xl mx-auto mt-10 min-h-[60vh]">
      {/* Left sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 pr-6">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div key={section.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {section.subsections.map((subsection) => (
                      <NavLink
                        key={subsection.id}
                        to={`/documentation/${section.id}/${subsection.id}`}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm transition-colors ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`
                        }
                      >
                        {subsection.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 pl-10">
        <div className="max-w-4xl">
          {SECTION_CONTENT[section] || (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Documentation Coming Soon</h2>
              <p className="text-gray-600">This section is under development. Check back soon for comprehensive guides and tutorials.</p>
            </div>
          )}
        </div>
      </div>

      <AIChatDrawer isOpen={isChatDrawerOpen} onClose={() => setIsChatDrawerOpen(false)} />
    </div>
  );
};

export default Documentation; 