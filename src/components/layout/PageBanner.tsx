import React from 'react';

interface PageBannerProps {
  title?: string;
  description?: string;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}

const PageBanner: React.FC<PageBannerProps> = ({ title, description, tabs, children }) => (
  <div className="bg-transparent border-b border-[#e0e7ef] pt-3" style={{margin:0}}>
    {/* Header Section */}
    {(title || description) && (
      <div className="flex items-center justify-between mb-4">
        {(title || description) && (
          <div>
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
        )}
      </div>
    )}
    
    {/* Tabs Section */}
    {tabs && (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs}
        </nav>
      </div>
    )}
    
    {/* Additional Children */}
    {children}
  </div>
);

export default PageBanner; 