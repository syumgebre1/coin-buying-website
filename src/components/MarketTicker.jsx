import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MarketTicker() {
  const [offset, setOffset] = useState(0);
  const [prices, setPrices] = useState({
    btc: { price: 4250000, change: '+2.4%' },
    eth: { price: 110000, change: '+1.8%' },
    gold: { price: 3800, change: '-0.5%' },
    usd: { price: 57.50, change: '+0.1%' }
  });

  useEffect(() => {
    // Fetch prices from Admin settings
    const unsubscribe = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().marketPrices) {
        setPrices(docSnap.data().marketPrices);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev <= -100 ? 100 : prev - 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (num) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', backgroundColor: '#0a0e29', color: '#4caf50', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #333', marginBottom: '20px', borderRadius: '8px' }}>
      <div style={{ display: 'inline-block', transform: `translateX(${offset}%)`, transition: 'transform 0.05s linear' }}>
        <span style={{ marginRight: '40px' }}>🟢 BTC/ETB: {formatPrice(prices.btc.price)} ({prices.btc.change})</span>
        <span style={{ marginRight: '40px' }}>🟢 ETH/ETB: {formatPrice(prices.eth.price)} ({prices.eth.change})</span>
        <span style={{ marginRight: '40px' }}>🔴 XAU/USD: {formatPrice(prices.gold.price)} ({prices.gold.change})</span>
        <span style={{ marginRight: '40px' }}>🟢 USD/ETB: {formatPrice(prices.usd.price)} ({prices.usd.change})</span>
        <span style={{ marginRight: '40px' }}>🟢 SYUM COIN: 1.00 ETB (Stable)</span>
        {/* Duplicate for smooth scrolling */}
        <span style={{ marginRight: '40px' }}>🟢 BTC/ETB: {formatPrice(prices.btc.price)} ({prices.btc.change})</span>
        <span style={{ marginRight: '40px' }}>🟢 ETH/ETB: {formatPrice(prices.eth.price)} ({prices.eth.change})</span>
      </div>
    </div>
  );
}
