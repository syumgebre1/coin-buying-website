import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';
import MarketTicker from './MarketTicker';
import { fireConfetti } from '../utils/confetti';

export default function GetCoinsPage() {
  const navigate = useNavigate();
  const [userCoins, setUserCoins] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [streak, setStreak] = useState(0);
  const [coinRate, setCoinRate] = useState(10);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeUser = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserCoins(data.coins || 0);
        setLastCheckIn(data.lastCheckIn || null);
        setStreak(data.streak || 0);
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) {
        setCoinRate(docSnap.data().coinRate || 10);
      }
    });

    return () => { unsubscribeUser(); unsubscribeSettings(); };
  }, []);

  const handleDailyBonus = async () => {
    const today = new Date().toDateString();
    if (lastCheckIn === today) {
      return toast.error("You already claimed your daily bonus today!");
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = lastCheckIn === yesterday.toDateString();
    
    const newStreak = wasYesterday ? streak + 1 : 1;
    
    let reward = 20;
    if (newStreak >= 7) reward = 150;
    else if (newStreak >= 5) reward = 100;
    else if (newStreak >= 3) reward = 50;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      
      await updateDoc(userRef, { 
        coins: currentCoins + reward,
        lastCheckIn: today,
        streak: newStreak
      });
      toast.success(`Day ${newStreak} Streak! Claimed +${reward} Coins 🎁`);
      fireConfetti(); // 🎉 Confetti effect
    } catch (error) {
      toast.error("Error claiming bonus.");
    }
  };

  const handleBuy = (coins) => {
    const costInBirr = coins / coinRate;
    localStorage.setItem('buyAmount', costInBirr);
    localStorage.setItem('buyCoins', coins);
    navigate('/payment');
  };

  const redeemPromo = async () => {
    if (!promoCode) return;
    try {
      const promoRef = doc(db, "promos", promoCode.toUpperCase());
      const promoSnap = await getDoc(promoRef);
      if (!promoSnap.exists()) return toast.error("Invalid promo code!");
      const promoData = promoSnap.data();
      if (promoData.used) return toast.error("This code has already been used!");

      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      
      await updateDoc(userRef, { coins: currentCoins + promoData.coins });
      await updateDoc(promoRef, { used: true });
      
      toast.success(`Redeemed ${promoData.coins} coins!`);
      fireConfetti();
      setPromoCode('');
    } catch (error) {
      toast.error("Error redeeming code.");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';
  const today = new Date().toDateString();
  const hasCheckedIn = lastCheckIn === today;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <MarketTicker />
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 4px 10px rgba(26,35,126,0.3)' }}>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>My Balance</p>
        <h1 style={{ margin: '5px 0 0 0', fontSize: '36px' }}>🪙 {userCoins} <span style={{ fontSize: '16px' }}>Coins</span></h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button onClick={() => navigate('/casino')} style={{ flex: 1, padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          🎰 Casino
        </button>
        <button onClick={() => navigate('/withdraw')} style={{ flex: 1, padding: '15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          💸 Withdraw
        </button>
        <button onClick={handleDailyBonus} disabled={hasCheckedIn} style={{ flex: 1, padding: '15px', backgroundColor: hasCheckedIn ? '#9e9e9e' : '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: hasCheckedIn ? 'not-allowed' : 'pointer' }}>
          {hasCheckedIn ? 'Claimed ✓' : `🔥 Day ${streak + 1}`}
        </button>
      </div>
      <p style={{ fontSize: '11px', color: '#666', marginBottom: '20px' }}>Streak Bonus: Day 3 (50🪙), Day 5 (100🪙), Day 7 (150🪙)</p>

      <h2 style={{ color: textColor }}>Buy Coins</h2>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Current Rate: 1 Birr = {coinRate} Coins</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => handleBuy(250)} style={{ padding: '15px', fontSize: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, cursor: 'pointer', backgroundColor: cardBg, color: textColor }}>
          <strong>250 Coins</strong> - {(250 / coinRate).toLocaleString()} Birr
        </button>
        <button onClick={() => handleBuy(500)} style={{ padding: '15px', fontSize: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, cursor: 'pointer', backgroundColor: cardBg, color: textColor }}>
          <strong>500 Coins</strong> - {(500 / coinRate).toLocaleString()} Birr
        </button>
        <button onClick={() => handleBuy(1000)} style={{ padding: '15px', fontSize: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, cursor: 'pointer', backgroundColor: cardBg, color: textColor }}>
          <strong>1000 Coins</strong> - {(1000 / coinRate).toLocaleString()} Birr
        </button>
        <button onClick={() => navigate('/custom')} style={{ padding: '15px', fontSize: '16px', borderRadius: '8px', border: '1px solid #1a237e', cursor: 'pointer', backgroundColor: darkMode ? '#2a2a5a' : '#e8eaf6', color: darkMode ? '#fff' : '#1a237e', fontWeight: 'bold' }}>
          Custom Amount
        </button>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: textColor, fontSize: '16px' }}>Redeem Promo Code</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor }} />
          <button onClick={redeemPromo} style={{ padding: '10px 20px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
