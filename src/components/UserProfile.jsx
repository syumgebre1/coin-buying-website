import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  
  // Username Edit State
  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile(data);
        setNewUsername(data.username || '');
      }

      const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
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

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return toast.error("Username cannot be empty.");
    if (newUsername === profile.username) return toast.success("Username is already up to date.");
    
    setIsUpdating(true);
    try {
      // Check if new username is taken
      const q = query(collection(db, "users"), where("username", "==", newUsername.toLowerCase()));
      const snap = await getDocs(q);
      
      // If it exists and it's not the current user's document
      if (!snap.empty && snap.docs[0].id !== auth.currentUser.uid) {
        return toast.error("This username is already taken.");
      }

      // Update username
      await updateDoc(doc(db, "users", auth.currentUser.uid), { username: newUsername.toLowerCase() });
      setProfile({ ...profile, username: newUsername.toLowerCase() });
      toast.success("Username updated successfully!");
    } catch (e) {
      toast.error("Error updating username.");
    }
    setIsUpdating(false);
  };

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
    const text = `Join me on SYUM BET and we both get bonuses! Use my code: ${profile.inviteCode}`;
    if (navigator.share) {
      navigator.share({ title: 'SYUM BET', text: text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Referral message copied to clipboard!");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';
  const inputBg = darkMode ? '#121212' : 'white';

  if (!profile) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;

  const joinDate = new Date(profile.createdAt).toLocaleDateString();
  const winRate = stats.totalBets === 0 ? 0 : Math.round((stats.wins / stats.totalBets) * 100);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor, position: 'relative' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: profile.isBanned ? '#d32f2f' : '#1a237e', color: 'white', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
          {profile.username ? profile.username.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
        </div>
        <h2>@{profile.username || profile.email.split('@')[0]}</h2>
        <p style={{ color: '#666', margin: '5px 0' }}>{profile.email}</p>
        <p style={{ color: '#666', margin: '5px 0', fontSize: '12px' }}>Joined: {joinDate}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
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

      {/* NEW: Account Settings with Username Edit */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>⚙️ Account Settings</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Edit Username</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={newUsername} 
              onChange={(e) => setNewUsername(e.target.value)} 
              placeholder="Enter new username"
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${cardBorder}`, backgroundColor: inputBg, color: textColor }} 
            />
            <button 
              onClick={handleUpdateUsername} 
              disabled={isUpdating}
              style={{ padding: '10px 20px', backgroundColor: isUpdating ? '#9e9e9e' : '#1a237e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <button onClick={handlePasswordReset} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          🔑 Change Password
        </button>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>🏅 Achievements</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {profile.coins >= 1000 && <div style={{ backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5', padding: '10px', borderRadius: '8px', textAlign: 'center', flex: '1 1 30%', border: `1px solid ${cardBorder}` }}><div style={{ fontSize: '24px' }}>💎</div><div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginTop: '5px' }}>High Roller</div></div>}
          {stats.wins >= 10 && <div style={{ backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5', padding: '10px', borderRadius: '8px', textAlign: 'center', flex: '1 1 30%', border: `1px solid ${cardBorder}` }}><div style={{ fontSize: '24px' }}>🔥</div><div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginTop: '5px' }}>Hot Streak</div></div>}
          {profile.streak >= 7 && <div style={{ backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5', padding: '10px', borderRadius: '8px', textAlign: 'center', flex: '1 1 30%', border: `1px solid ${cardBorder}` }}><div style={{ fontSize: '24px' }}>📅</div><div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginTop: '5px' }}>Dedicated</div></div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/withdraw')} style={{ flex: 1, padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Withdraw</button>
        <button onClick={() => setShowChat(!showChat)} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💬 Support</button>
        <button onClick={shareReferral} style={{ flex: 1, padding: '15px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>🎁 Share</button>
      </div>

      {showChat && <SupportChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
