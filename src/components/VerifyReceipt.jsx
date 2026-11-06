import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { useContext } from 'react';

export default function VerifyReceipt() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);

  const user = searchParams.get('user');
  const balance = searchParams.get('balance');
  const app = searchParams.get('app');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (user && balance && app === "SYUM BET") {
      setIsValid(true);
    }
  }, [user, balance, app]);

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  if (!isValid) {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center', color: textColor }}>
        <h1 style={{ fontSize: '60px', margin: 0 }}>❌</h1>
        <h2 style={{ color: '#d32f2f' }}>Invalid Receipt</h2>
        <p>This document could not be verified by SYUM BET.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Go Home</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center', color: textColor }}>
      <div style={{ backgroundColor: '#e8f5e9', border: '2px solid #4caf50', padding: '30px', borderRadius: '16px', marginBottom: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#4caf50', color: 'white', fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>✓</div>
        <h2 style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>Verified Document</h2>
        <p style={{ color: '#2e7d32', margin: 0, fontSize: '14px' }}>This statement is officially issued by SYUM BET.</p>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '30px', borderRadius: '16px', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '10px' }}>Account Information</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Account Holder</p>
          <h2 style={{ margin: 0 }}>@{user}</h2>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Verified Balance</p>
          <h2 style={{ margin: 0, color: '#f57c00' }}>🪙 {Number(balance).toLocaleString()} Coins</h2>
        </div>

        <div>
          <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Issued By</p>
          <h3 style={{ margin: 0, color: '#1a237e' }}>SYUM BET Platform</h3>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#888', marginTop: '20px' }}>Scanned via QR Code. Verified on {new Date().toLocaleDateString()}</p>
    </div>
  );
}
