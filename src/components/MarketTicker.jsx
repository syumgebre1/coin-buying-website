import React, { useEffect, useState } from 'react';

export default function MarketTicker() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev <= -100 ? 100 : prev - 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', backgroundColor: '#0a0e29', color: '#4caf50', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #333', marginBottom: '20px', borderRadius: '8px' }}>
      <div style={{ display: 'inline-block', transform: `translateX(${offset}%)`, transition: 'transform 0.05s linear' }}>
        <span style={{ marginRight: '40px' }}>🟢 BTC/ETB: 4,250,000 (+2.4%)</span>
        <span style={{ marginRight: '40px' }}>🟢 ETH/ETB: 210,000 (+1.8%)</span>
        <span style={{ marginRight: '40px' }}>🔴 XAU/USD: 2,150 (-0.5%)</span>
        <span style={{ marginRight: '40px' }}>🟢 USD/ETB: 57.50 (+0.1%)</span>
        <span style={{ marginRight: '40px' }}>🟢 SYUM COIN: 1.00 ETB (Stable)</span>
        <span style={{ marginRight: '40px' }}>🟢 BTC/ETB: 4,250,000 (+2.4%)</span>
        <span style={{ marginRight: '40px' }}>🟢 ETH/ETB: 210,000 (+1.8%)</span>
      </div>
    </div>
  );
}
