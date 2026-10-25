import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function CustomAmountPage() {
  const [amount, setAmount] = useState(0);
  const [coinRate, setCoinRate] = useState(10); // Default to 10
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRate = async () => {
      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) {
        setCoinRate(settingsDoc.data().coinRate || 10);
      }
    };
    fetchRate();
  }, []);

  const handleNumberClick = (num) => setAmount(Number(String(amount) + num));
  const handleDelete = () => setAmount(Number(String(amount).slice(0, -1)) || 0);
  
  // Calculate coins dynamically based on the admin's rate
  const calculatedCoins = amount * coinRate;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <h2>Custom Amount</h2>
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Payment Amount</p>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>{amount} Birr</div>
        <p style={{ margin: '5px 0 0 0', color: '#f57c00', fontWeight: 'bold' }}>🪙 {calculatedCoins} Coins</p>
        <small style={{ color: '#666' }}>(Current Rate: 1 Birr = {coinRate} Coins)</small>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handleNumberClick(num)} style={{ padding: '15px', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white' }}>{num}</button>
        ))}
        <button onClick={handleDelete} style={{ padding: '15px', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#ffcdd2' }}>⌫</button>
        <button onClick={() => handleNumberClick(0)} style={{ padding: '15px', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white' }}>0</button>
        <button onClick={() => {
          localStorage.setItem('buyAmount', amount);
          localStorage.setItem('buyCoins', calculatedCoins);
          navigate('/payment');
        }} style={{ padding: '15px', fontSize: '20px', borderRadius: '8px', border: '1px solid #1a237e', backgroundColor: '#1a237e', color: 'white', fontWeight: 'bold' }}>Pay</button>
      </div>
    </div>
  );
}
