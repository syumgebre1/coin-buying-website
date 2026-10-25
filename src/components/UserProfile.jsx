import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';
import SupportChat from './SupportChat';

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalBets: 0, wins: 0, losses: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) setProfile(userDoc.data());

      const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(d => d.data());
      
      const bets = txs.filter(t => t.amount === 0);
      const wins = bets.filter(t => t.status === 'won').length;
      const losses = bets.filter(t => t.status === 'lost').length;

      setStats({ totalBets: bets.length, wins, losses });

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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor, position: 'relative' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: profile.isBanned ? '#d32f2f' : '#1a237e', color: 'white', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
          {profile.email.charAt(0).toUpperCase()}
        </div>
        <h2>{profile.email}</h2>
        <p style={{ color: '#666', margin: '5px 0' }}>Joined: {joinDate}</p>
        
        {/* BADGES */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {profile.role === 'admin' && <span style={{ backgroundColor: '#ffcdd2', color: '#b71c1c', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>ADMIN</span>}
          {profile.isBanned && <span style={{ backgroundColor: '#d32f2f', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>BANNED</span>}
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/withdraw')} style={{ flex: 1, padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          💸 Withdraw
        </button>
        <button onClick={() => setShowChat(!showChat)} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          💬 Support
        </button>
        <button onClick={shareReferral} style={{ flex: 1, padding: '15px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          🎁 Share
        </button>
      </div>

      {withdrawals.length > 0 && (
        <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Withdrawal Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {withdrawals.map(wd => (
              <div key={wd.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', border: `1px solid ${cardBorder}`, borderRadius: '8px' }}>
                <div>
                  <strong>{wd.etbAmount} Birr</strong> <br/>
                  <small style={{ color: '#666' }}>{wd.bankName} - {wd.accountNo}</small>
                </div>
                <div>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', backgroundColor: wd.status === 'paid' ? '#e8f5e9' : wd.status === 'rejected' ? '#ffebee' : '#fff3e0', color: wd.status === 'paid' ? '#2e7d32' : wd.status === 'rejected' ? '#c62828' : '#ef6c00' }}>
                    {wd.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Casino Statistics</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Total Games Played:</span>
          <strong>{stats.totalBets}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Games Won:</span>
          <strong style={{ color: '#4caf50' }}>{stats.wins}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Games Lost:</span>
          <strong style={{ color: '#d32f2f' }}>{stats.losses}</strong>
        </div>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Settings</h3>
        <button onClick={handlePasswordReset} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#1a237e', border: '1px solid #1a237e', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          🔑 Change Password (Send Email)
        </button>
      </div>

      {showChat && <SupportChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
