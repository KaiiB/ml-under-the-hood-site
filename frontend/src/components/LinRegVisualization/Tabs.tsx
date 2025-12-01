import React from 'react';
import '../KMeansVisualization/Tabs.css';

interface TabsProps {
  activeTab: 'main' | 'math';
  onTabChange: (tab: 'main' | 'math') => void;
  children: React.ReactNode;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="tabs-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => onTabChange('main')}
        >
          Main Visualization
        </button>
        <button
          className={`tab ${activeTab === 'math' ? 'active' : ''}`}
          onClick={() => onTabChange('math')}
        >
          Mathematical Details
        </button>
      </div>
      {children}
    </div>
  );
};

export default Tabs;

