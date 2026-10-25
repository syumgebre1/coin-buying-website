import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchTopUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const users = snapshot.docs.map(d => d.data());
      // Sort by highest coins and take top 10
      const sorted = users.sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 10);
      setTopUsers(sorted);
    };
    fetchTopUsers();
  }, []);

  const textColor = darkMode ? '#fff' : '#000';
  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🏆</div>
        <h2>Global Leaderboard</h2>
        <p style={{ color: '#666' }}>Top 10 Richest Players</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {topUsers.map((user, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '12px' }}>
            <div style={{ width: '30px', fontSize: '18px', fontWeight: 'bold', color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : textColor }}>
              #{index + 1}
            </div>
            <div style={{ flex: 1, marginLeft: '10px' }}>
              <strong style={{ display: 'block', fontSize: '14px' }}>{user.email.split('@')[0]}</strong>
              <span style={{ fontSize: '12px', color: '#666' }}>{user.email}</span>
            </div>
            <div style={{ fontWeight: 'bold', color: '#f57c00' }}>
              🪙 {user.coins || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
