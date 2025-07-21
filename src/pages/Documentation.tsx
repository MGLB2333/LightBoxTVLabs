import React, { useState } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import AIBannerButton from '../components/layout/AIBannerButton';
import AIChatDrawer from '../components/layout/AIChatDrawer';
import { FileText, Search, Download, Share2, BookOpen, Code, Database, Settings, HelpCircle } from 'lucide-react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';

const DOC_SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'ai', label: 'AI & Automation' },
  { id: 'faq', label: 'FAQ' },
];

const SECTION_CONTENT: Record<string, React.ReactNode> = {
  'getting-started': (
    <>
      <h2 className="text-xl font-bold mb-2">Getting Started</h2>
      <p className="mb-2">Welcome to LightBoxTV! Here’s how to get up and running fast:</p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Sign up and verify your account.</li>
        <li>Add your organization and invite team members.</li>
        <li>Connect integrations (YouTube, TV, etc).</li>
        <li>Start building campaigns and exploring analytics.</li>
      </ol>
    </>
  ),
  'campaigns': (
    <>
      <h2 className="text-xl font-bold mb-2">Campaigns</h2>
      <p>Learn how to create, manage, and analyze your TV and CTV campaigns in LightBoxTV.</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Creating a new campaign</li>
        <li>Editing and duplicating campaigns</li>
        <li>Viewing campaign analytics</li>
      </ul>
    </>
  ),
  'integrations': (
    <>
      <h2 className="text-xl font-bold mb-2">Integrations</h2>
      <p>Connect LightBoxTV to your favorite platforms for richer data and automation.</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Connecting YouTube</li>
        <li>Connecting TV data providers</li>
        <li>Managing integration settings</li>
      </ul>
    </>
  ),
  'ai': (
    <>
      <h2 className="text-xl font-bold mb-2">AI & Automation</h2>
      <p>Discover how to use LightBoxTV AI for recommendations, chat, and campaign optimization.</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Using the AI assistant</li>
        <li>Automated recommendations</li>
        <li>Best practices for AI-driven planning</li>
      </ul>
    </>
  ),
  'faq': (
    <>
      <h2 className="text-xl font-bold mb-2">FAQ</h2>
      <p>Common questions and answers about LightBoxTV.</p>
      <ul className="list-disc list-inside space-y-1">
        <li>How do I reset my password?</li>
        <li>How do I invite a teammate?</li>
        <li>How do I contact support?</li>
      </ul>
    </>
  ),
};

const Documentation: React.FC = () => {
  const setBanner = useSetBanner();
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const params = useParams();
  const section = params.section || DOC_SECTIONS[0].id;

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

  return (
    <div key={section} className="flex w-full max-w-6xl mx-auto mt-10 min-h-[60vh]">
      {/* Left menu */}
      <nav className="w-56 flex-shrink-0 border-r border-gray-200 pr-6">
        <ul className="space-y-1">
          {DOC_SECTIONS.map((s) => (
            <li key={s.id}>
              <NavLink
                to={`/documentation/${s.id}`}
                className={({ isActive }) =>
                  `w-full block text-left px-3 py-2 rounded-md transition-colors text-base font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                end
              >
                {s.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {/* Right content */}
      <div className="flex-1 pl-10">
        {SECTION_CONTENT[section] || <div className="text-gray-500">Section not found.</div>}
      </div>
      <AIChatDrawer isOpen={isChatDrawerOpen} onClose={() => setIsChatDrawerOpen(false)} />
    </div>
  );
};

export default Documentation; 