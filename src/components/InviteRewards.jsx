import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function InviteRewards() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [referredUsers, setReferredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) setUserData(userDoc.data());

        const q = query(collection(db, "users"), where("referredBy", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        setReferredUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetchReferralData();
  }, []);

  const copyLink = () => {
    if (!userData?.inviteCode) return;
    const link = `https://syum-bet.web.app/login?ref=${userData.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied! Share it with friends.");
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <h2>Invite Friends & Earn</h2>
        <p>Get 100 Coins for every friend who joins and makes a deposit!</p>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Your Referral Code</p>
          <h1 style={{ margin: 0, letterSpacing: '2px' }}>{userData?.inviteCode || 'N/A'}</h1>
        </div>
        <button onClick={copyLink} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
          📋 Copy Invite Link
        </button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <h3>Your Referrals ({referredUsers.length})</h3>
        {referredUsers.length === 0 ? (
          <p style={{ color: '#666' }}>You haven't invited anyone yet. Share your link to start earning!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {referredUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <span>@{u.username || u.email.split('@')[0]}</span>
                <span style={{ color: u.hasDepositedBefore ? '#4caf50' : '#f59e0b', fontWeight: 'bold' }}>
                  {u.hasDepositedBefore ? '✅ Deposit Made' : '⏳ Waiting for Deposit'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
