import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';

export default function BettingGame() {
  const navigate = useNavigate();
  const [userCoins, setUserCoins] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [choice, setChoice] = useState('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState(null);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) setUserCoins(userDoc.data().coins || 0);
      }
    };
    fetchUser();
  }, []);

  const playGame = async () => {
    if (betAmount <= 0) return toast.error("Bet must be greater than 0");
    if (betAmount > userCoins) return toast.error("Not enough coins!");

    setIsFlipping(true);
    setResult(null);

    // Simulate coin flip animation delay
    setTimeout(async () => {
      const outcomes = ['heads', 'tails'];
      const flipResult = outcomes[Math.floor(Math.random() * outcomes.length)];
      const didWin = flipResult === choice;
      setResult({ win: didWin, outcome: flipResult });

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        let newBalance = userCoins;

        if (didWin) {
          newBalance += betAmount; // Win: get double (keep original + win bet)
          toast.success(`You won ${betAmount} coins!`);
        } else {
          newBalance -= betAmount; // Lose: lose the bet
          toast.error(`You lost ${betAmount} coins.`);
        }

        // Update user balance
        await updateDoc(userRef, { coins: newBalance });
        setUserCoins(newBalance);

        // Log the bet to database for admin records
        await addDoc(collection(db, "transactions"), {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          amount: 0,
          coins: betAmount,
          method: 'Coin Flip Bet',
          status: didWin ? 'won' : 'lost',
          receiptUrl: '',
          createdAt: new Date().toISOString()
        });

      } catch (error) {
        toast.error("Error processing bet.");
      }
      setIsFlipping(false);
    }, 1500); // 1.5 seconds delay
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(26,35,126,0.3)' }}>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>My Balance</p>
        <h1 style={{ margin: '5px 0 0 0', fontSize: '36px' }}>🪙 {userCoins} <span style={{ fontSize: '16px' }}>Coins</span></h1>
      </div>

      <h2 style={{ color: textColor }}>Coin Flip Betting</h2>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button 
            onClick={() => setChoice('heads')} 
            style={{ flex: 1, padding: '15px', marginRight: '10px', borderRadius: '8px', border: choice === 'heads' ? '2px solid #1a237e' : `1px solid ${cardBorder}`, backgroundColor: choice === 'heads' ? (darkMode ? '#2a2a5a' : '#e8eaf6') : 'transparent', color: textColor, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            👑 Heads
          </button>
          <button 
            onClick={() => setChoice('tails')} 
            style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'tails' ? '2px solid #1a237e' : `1px solid ${cardBorder}`, backgroundColor: choice === 'tails' ? (darkMode ? '#2a2a5a' : '#e8eaf6') : 'transparent', color: textColor, cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            🦅 Tails
          </button>
        </div>

        <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>Bet Amount</label>
        <input 
          type="number" 
          value={betAmount} 
          onChange={(e) => setBetAmount(Number(e.target.value))} 
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor, marginBottom: '20px' }}
        />

        <button 
          onClick={playGame} 
          disabled={isFlipping}
          style={{ width: '100%', padding: '15px', backgroundColor: isFlipping ? '#999' : '#f57c00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: isFlipping ? 'not-allowed' : 'pointer' }}
        >
          {isFlipping ? 'Flipping...' : 'Flip Coin!'}
        </button>

        {result && (
          <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', backgroundColor: result.win ? '#e8f5e9' : '#ffebee', color: result.win ? '#2e7d32' : '#c62828' }}>
            <h3 style={{ margin: 0 }}>Result: {result.outcome.toUpperCase()}</h3>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>{result.win ? 'You Won! 🎉' : 'You Lost 💔'}</p>
          </div>
        )}
      </div>

      <button onClick={() => navigate('/')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#1a237e', fontWeight: 'bold', cursor: 'pointer' }}>← Back to Home</button>
    </div>
  );
}
