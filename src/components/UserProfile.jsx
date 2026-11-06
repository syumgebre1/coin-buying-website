import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ThemeContext } from '../ThemeContext';
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import toast from 'react-hot-toast';
import SupportChat from './SupportChat';

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalBets: 0, wins: 0, losses: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [pin, setPin] = useState('');
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
        setPin(data.withdrawPin || '');
      }

      const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(txs);
      
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
    setIsUpdating(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", newUsername.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== auth.currentUser.uid) {
        setIsUpdating(false);
        return toast.error("This username is already taken.");
      }
      await updateDoc(doc(db, "users", auth.currentUser.uid), { username: newUsername.toLowerCase() });
      setProfile({ ...profile, username: newUsername.toLowerCase() });
      toast.success("Username updated successfully!");
    } catch (e) { toast.error("Error updating username."); }
    setIsUpdating(false);
  };

  const handleUpdatePin = async () => {
    if (pin.length !== 4 || isNaN(pin)) return toast.error("PIN must be exactly 4 digits.");
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { withdrawPin: pin });
      setProfile({ ...profile, withdrawPin: pin });
      toast.success("Withdrawal PIN updated securely!");
    } catch (e) { toast.error("Error updating PIN."); }
    setIsUpdating(false);
  };

  const generateStatement = async () => {
    const doc = new jsPDF();
    
    // Dark Navy Header
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Gold Accent Line
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 45, 210, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("SYUM BET", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL ACCOUNT STATEMENT", 105, 32, { align: "center" });

    // User Details
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Account Holder:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`@${profile.username || 'User'}`, 60, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Current Balance:", 20, 75);
    doc.setTextColor(212, 175, 55);
    doc.text(`${profile.coins} Coins`, 60, 75);

    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text("Generated On:", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleString()}`, 60, 85);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 100, 170, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Date", 22, 107);
    doc.text("Description", 60, 107);
    doc.text("Coins", 130, 107);
    doc.text("Status", 160, 107);

    // Table Rows
    doc.setFont("helvetica", "normal");
    let y = 120;
    transactions.slice(0, 15).forEach((tx) => {
      if (y > 250) { doc.addPage(); y = 20; }
      const date = new Date(tx.createdAt).toLocaleDateString();
      const type = tx.amount > 0 ? `Deposit (${tx.amount} ETB)` : tx.method;
      
      doc.text(date, 22, y);
      doc.text(type, 60, y);
      doc.text(`${tx.coins}`, 130, y);
      
      if (tx.status === 'completed') doc.setTextColor(46, 125, 50);
      else if (tx.status === 'pending') doc.setTextColor(245, 124, 0);
      else doc.setTextColor(198, 40, 40);
      
      doc.text(tx.status.toUpperCase(), 160, y);
      doc.setTextColor(0, 0, 0);
      y += 10;
    });

    // URL-based QR Code
    const baseUrl = "https://coin-buying-website.web.app/verify-statement";
    const qrUrl = `${baseUrl}?user=${profile.username}&balance=${profile.coins}&app=SYUM BET`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 150 });
    
    doc.addImage(qrDataUrl, 'PNG', 150, 220, 40, 40);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Scan to verify authenticity", 150, 265);

    // Footer
    doc.setFontSize(10);
    doc.text("Thank you for using SYUM BET. Play responsibly.", 20, 285);

    doc.save(`SYUM_BET_Statement_${profile.username}.pdf`);
    toast.success("Statement downloaded!");
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';
  const inputBg = darkMode ? '#121212' : 'white';

  if (!profile) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;

  const winRate = stats.totalBets === 0 ? 0 : Math.round((stats.wins / stats.totalBets) * 100);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor, position: 'relative' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1a237e', color: 'white', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
          {profile.username ? profile.username.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
        </div>
        <h2>@{profile.username || profile.email.split('@')[0]}</h2>
        <p style={{ color: '#666', margin: '5px 0' }}>{profile.email}</p>
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

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>⚙️ Account Settings</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Edit Username</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${cardBorder}`, backgroundColor: inputBg, color: textColor }} />
            <button onClick={handleUpdateUsername} disabled={isUpdating} style={{ padding: '10px 20px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Withdrawal PIN (4 digits)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="password" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={profile.withdrawPin ? "••••" : "Set a PIN"} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${cardBorder}`, backgroundColor: inputBg, color: textColor }} />
            <button onClick={handleUpdatePin} disabled={isUpdating} style={{ padding: '10px 20px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
          </div>
        </div>

        <button onClick={generateStatement} style={{ width: '100%', padding: '12px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
          📄 Download Bank Statement
        </button>
        <button onClick={() => sendPasswordResetEmail(auth, auth.currentUser.email).then(() => toast.success("Reset link sent!"))} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          🔑 Change Password
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/withdraw')} style={{ flex: 1, padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Withdraw</button>
        <button onClick={() => setShowChat(!showChat)} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💬 Support</button>
      </div>

      {showChat && <SupportChat onClose={() => setShowChat(false)} />}
    </div>
  );
}
