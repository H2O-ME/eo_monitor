import React from 'react';

export default function Loading() {
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      color: '#64748b',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #e2e8f0', 
          borderTopColor: '#3b82f6', 
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>正在加载监控数据...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    </div>
  );
}
