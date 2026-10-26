import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const [topWinners, setTopWinners] = useState([]);
  const [activeTab, setActiveTab] = useState('richest'); // 'richest' or 'winners'
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Richest Users
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map(d => d.data());
      const sortedUsers = users.sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 10);
      setTopUsers(sortedUsers);

      // 2. Fetch Top Winners (Based on Total Wins in Transactions)
      const txSnap = await getDocs(collection(db, "transactions"));
      const txs = txSnap.docs.map(d => d.data());
      
      const winCounts = {};
      txs.filter(t => t.status === 'won').forEach(tx => {
        winCounts[tx.userEmail] = (winCounts[tx.userEmail] || 0) + 1;
      });

      const sortedWinners = Object.keys(winCounts)
        .map(email => ({ email, wins: winCounts[email] }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);
      
      setTopWinners(sortedWinners);
    };
    fetchData();
  }, []);

  const textColor = darkMode ? '#fff' : '#000';
  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🏆</div>
        <h2>Global Leaderboard</h2>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: `1px solid ${cardBorder}` }}>
        <button 
          onClick={() => setActiveTab('richest')} 
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'richest' ? '3px solid #1a237e' : 'none', color: activeTab === 'richest' ? '#1a237e' : '#666', fontWeight: 'bold', cursor: 'pointer' }}
        >
          💰 Richest Players
        </button>
        <button 
          onClick={() => setActiveTab('winners')} 
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'winners' ? '3px solid #f57c00' : 'none', color: activeTab === 'winners' ? '#f57c00' : '#666', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🎰 Top Casino Winners
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeTab === 'richest' ? (
          topUsers.map((user, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '12px' }}>
              <div style={{ width: '30px', fontSize: '18px', fontWeight: 'bold', color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : textColor }}>#{index + 1}</div>
              <div style={{ flex: 1, marginLeft: '10px' }}>
                <strong style={{ display: 'block', fontSize: '14px' }}>{user.email.split('@')[0]}</strong>
              </div>
              <div style={{ fontWeight: 'bold', color: '#f57c00' }}>🪙 {user.coins || 0}</div>
            </div>
          ))
        ) : (
          topWinners.map((user, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '12px' }}>
              <div style={{ width: '30px', fontSize: '18px', fontWeight: 'bold', color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : textColor }}>#{index + 1}</div>
              <div style={{ flex: 1, marginLeft: '10px' }}>
                <strong style={{ display: 'block', fontSize: '14px' }}>{user.email.split('@')[0]}</strong>
              </div>
              <div style={{ fontWeight: 'bold', color: '#4caf50' }}>🏆 {user.wins} Wins</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
