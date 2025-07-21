import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * LoadingSpinner - A reusable loading component with static LightBox Labs logomark and animated loading bar
 * 
 * Features:
 * - Static logomark using the primary brand logo
 * - Animated loading bar in primary blue color
 * - Customizable text message (defaults to "Crunching the numbers...")
 * - Multiple size options for different contexts
 * - Flexible styling with className prop
 * 
 * Usage:
 * ```tsx
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // With custom text
 * <LoadingSpinner text="Loading map data..." />
 * 
 * // Different sizes
 * <LoadingSpinner size="lg" text="Processing..." />
 * 
 * // With custom styling
 * <LoadingSpinner className="my-8" size="xl" />
 * ```
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = "Crunching the numbers...", 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  const barSizes = {
    sm: 'w-16 h-1',
    md: 'w-24 h-1.5', 
    lg: 'w-32 h-2',
    xl: 'w-40 h-2.5'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} mb-4`}>
        <img 
          src="/LogoMark3.png" 
          alt="LightBox Labs" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Loading Bar */}
      <div className={`${barSizes[size]} bg-gray-200 rounded-full mb-4 overflow-hidden`}>
        <div 
          className="h-full bg-[#00b4e7] rounded-full"
          style={{
            animation: 'loading-bar 2s ease-in-out infinite'
          }}
        />
      </div>
      
      {text && (
        <p className={`text-gray-600 ${textSizes[size]} text-center`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner; 