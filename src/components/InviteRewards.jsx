import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function InviteRewards() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        setInviteCode(userDoc.data().inviteCode || "ERROR");
      }
    };
    fetchCode();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', textAlign: 'left' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginRight: '15px' }}>←</button>
        <h2 style={{ margin: 0 }}>Invite & Earn</h2>
      </div>

      <div style={{ fontSize: '60px', marginBottom: '10px' }}>🎁</div>
      <h3>Invite friends & get 50 Coins</h3>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>Share your code. When they sign up and use it, you instantly get 50 free coins!</p>

      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px', border: '1px dashed #1a237e' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Your Unique Invite Code</p>
        <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '4px', color: '#1a237e', marginBottom: '15px' }}>{inviteCode}</div>
        <button onClick={handleCopy} style={{ padding: '10px 24px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </div>
  );
}
