import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';
import { fireConfetti } from '../utils/confetti';

export default function Lottery() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchData = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) setProfile(userDoc.data());

      const q = query(collection(db, "lottery_tickets"));
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => d.data()));
    };
    fetchData();
  }, []);

  const buyTicket = async () => {
    if (profile.coins < 50) return toast.error("Not enough coins! You need 50 Coins.");
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { coins: profile.coins - 50 });
      setProfile({ ...profile, coins: profile.coins - 50 });

      await addDoc(collection(db, "lottery_tickets"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        createdAt: new Date().toISOString()
      });

      setTickets([...tickets, { userId: auth.currentUser.uid }]);
      toast.success("Ticket purchased! Good luck!");
      fireConfetti();
    } catch (e) {
      toast.error("Error buying ticket.");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  if (!profile) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', textAlign: 'center', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor, display: 'block' }}>← Back</button>
      
      <div style={{ fontSize: '60px', marginBottom: '10px' }}>🎰</div>
      <h2>Weekly Jackpot</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>Buy a ticket for 50 Coins. The Admin draws a winner every week!</p>

      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '30px', borderRadius: '12px', marginBottom: '20px' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>Total Tickets Sold</p>
        <h1 style={{ margin: '10px 0', fontSize: '48px' }}>{tickets.length}</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#f57c00' }}>Current Jackpot: {tickets.length * 50} Coins!</p>
      </div>

      <button onClick={buyTicket} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
        Buy Ticket (50 Coins)
      </button>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', textAlign: 'left' }}>Recent Participants</h3>
        {tickets.slice(-5).reverse().map((t, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${cardBorder}`, fontSize: '12px', textAlign: 'left', color: '#666' }}>
            🎟️ {t.userEmail}
          </div>
        ))}
        {tickets.length === 0 && <p style={{ fontSize: '12px', color: '#999' }}>Be the first to buy a ticket!</p>}
      </div>
    </div>
  );
}
