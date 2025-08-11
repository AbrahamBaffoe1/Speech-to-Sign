import { ReactNode } from 'react';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
}

const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Mobile-optimized container */}
      <div className="safe-area-inset">
        {children}
      </div>
      
      {/* Mobile navigation spacer for bottom safe area */}
      <div className="h-safe-bottom md:hidden"></div>
    </div>
  );
};

export default MobileOptimizedLayout;