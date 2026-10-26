import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ThemeContext } from '../ThemeContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import SupportChat from './SupportChat';

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalBets: 0, wins: 0, losses: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) setProfile(userDoc.data());

      const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const bets = txs.filter(t => t.amount === 0);
      const wins = bets.filter(t => t.status === 'won').length;
      const losses = bets.filter(t => t.status === 'lost').length;
      setStats({ totalBets: bets.length, wins, losses });

      const sortedTxs = txs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const last10 = sortedTxs.slice(-10);
      const graphData = last10.map((tx, index) => ({ name: `Tx ${index + 1}`, coins: tx.coins, type: tx.status }));
      setChartData(graphData);

      const wdQuery = query(collection(db, "withdrawals"), where("userId", "==", auth.currentUser.uid));
      const wdSnap = await getDocs(wdQuery);
      const wds = wdSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWithdrawals(wds);
    };
    fetchProfileAndStats();
  }, []);

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      toast.error("Error sending reset email.");
    }
  };

  const shareReferral = () => {
    if (!profile?.inviteCode) return;
    const text = `Join me on Coin App and we both get bonuses! Use my code: ${profile.inviteCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Coin App', text: text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Referral message copied to clipboard!");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  if (!profile) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;

  const joinDate = new Date(profile.createdAt).toLocaleDateString();
  const winRate = stats.totalBets === 0 ? 0 : Math.round((stats.wins / stats.totalBets) * 100);

  // Determine Achievements
  const achievements = [];
  if (profile.coins >= 1000) achievements.push({ icon: '💎', name: 'High Roller', desc: 'Hold 1,000+ coins' });
  if (stats.wins >= 10) achievements.push({ icon: '🔥', name: 'Hot Streak', desc: 'Win 10+ games' });
  if (profile.streak >= 7) achievements.push({ icon: '📅', name: 'Dedicated', desc: '7-day login streak' });
  if (profile.referredBy) achievements.push({ icon: '🤝', name: 'Recruited', desc: 'Joined with an invite' });
  if (profile.friends?.length > 0) achievements.push({ icon: '👥', name: 'Social', desc: 'Added a friend' });

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor, position: 'relative' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: profile.isBanned ? '#d32f2f' : '#1a237e', color: 'white', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
          {profile.email.charAt(0).toUpperCase()}
        </div>
        <h2>{profile.email}</h2>
        <p style={{ color: '#666', margin: '5px 0' }}>Joined: {joinDate}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {profile.role === 'admin' && <span style={{ backgroundColor: '#ffcdd2', color: '#b71c1c', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>ADMIN</span>}
          {profile.streak > 0 && <span style={{ backgroundColor: '#ffe0b2', color: '#e65100', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>🔥 {profile.streak} Day Streak</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#666' }}>Balance</p>
          <h2 style={{ margin: '10px 0 0 0', color: '#1a237e' }}>🪙 {profile.coins}</h2>
        </div>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#666' }}>Win Rate</p>
          <h2 style={{ margin: '10px 0 0 0', color: '#4caf50' }}>{winRate}%</h2>
        </div>
      </div>

      {/* ACHIEVEMENTS SECTION */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>🏅 Achievements</h3>
        {achievements.length === 0 ? <p style={{ fontSize: '12px', color: '#666' }}>Keep playing to unlock badges!</p> : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {achievements.map((ach, i) => (
              <div key={i} title={ach.desc} style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '8px', textAlign: 'center', flex: '1 1 30%', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '24px' }}>{ach.icon}</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{ach.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Recent Activity Graph</h3>
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}><XAxis dataKey="name" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ backgroundColor: darkMode ? '#333' : 'white', color: textColor }} /><Line type="monotone" dataKey="coins" stroke="#1a237e" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>Play some games to see your chart!</p>}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/withdraw')} style={{ flex: 1, padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Withdraw</button>
        <button onClick={() => setShowChat(!showChat)} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💬 Support</button>
        <button onClick={shareReferral} style={{ flex: 1, padding: '15px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>🎁 Share</button>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Settings</h3>
        <button onClick={handlePasswordReset} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#1a237e', border: '1px solid #1a237e', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>🔑 Change Password</button>
      </div>

      {showChat && <SupportChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
