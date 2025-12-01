import { useState } from 'react';
import LinReg from './scripts/LinReg';
import EM from './scripts/EM';
import KMeans from './scripts/KMeans';
import Regularization from './scripts/Regularization';

type Tab = 'linreg' | 'em' | 'kmeans' | 'regularization';

function App() {
  // Force 'linreg' as default tab
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Clear any stored tab preference
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeTab');
    }
    return 'linreg';
  });

  const tabs = [
    { id: 'linreg' as Tab, label: 'Linear Regression' },
    { id: 'regularization' as Tab, label: 'Regularization' },
    { id: 'em' as Tab, label: 'EM' },
    { id: 'kmeans' as Tab, label: 'K-Means' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'linreg':
        return <LinReg />;
      case 'regularization':
        return <Regularization />;
      case 'em':
        return <EM />;
      case 'kmeans':
        return <KMeans />;
      default:
        return <LinReg />;
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <div style={{ 
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '10px 20px',
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>ML Under The Hood</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#3b82f6' : '#e2e8f0',
                color: activeTab === tab.id ? 'white' : '#475569',
                cursor: 'pointer',
                borderRadius: '6px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 20px', backgroundColor: '#ffffff', minHeight: 'calc(100vh - 100px)' }}>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
