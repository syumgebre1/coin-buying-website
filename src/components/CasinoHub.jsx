import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';
import { fireConfetti } from '../utils/confetti'; // Import the new utility

export default function CasinoHub() {
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const [activeGame, setActiveGame] = useState(null);
  const [userCoins, setUserCoins] = useState(0);

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) setUserCoins(userDoc.data().coins || 0);
      }
    };
    fetchUser();
  }, [activeGame]);

  const updateBalanceAndLog = async (betAmount, winAmount, gameName, status) => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      
      const newBalance = currentCoins - betAmount + winAmount;
      await updateDoc(userRef, { coins: newBalance });
      setUserCoins(newBalance);

      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        amount: 0,
        coins: betAmount,
        method: gameName,
        status: status,
        winAmount: winAmount,
        receiptUrl: '',
        createdAt: new Date().toISOString()
      });

      if (status === 'won') {
        fireConfetti(); // Trigger the animation!
      }
    } catch (error) {
      toast.error("Error updating balance.");
    }
  };

  if (activeGame === 'coinflip') return <CoinFlip gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'dice') return <DiceRoller gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'wheel') return <SpinWheel gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'slots') return <SlotMachine gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'plinko') return <Plinko gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'guess') return <LuckyNumber gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>Casino Hub</h2>
        <p style={{ margin: '10px 0 0 0' }}>Balance: 🪙 {userCoins} Coins</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <GameCard title="Coin Flip" icon="🪙" onClick={() => setActiveGame('coinflip')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Dice Roller" icon="🎲" onClick={() => setActiveGame('dice')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Spin Wheel" icon="🎡" onClick={() => setActiveGame('wheel')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Slot Machine" icon="🎰" onClick={() => setActiveGame('slots')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Plinko Drop" icon="⚪" onClick={() => setActiveGame('plinko')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Lucky Number" icon="🔢" onClick={() => setActiveGame('guess')} bg={cardBg} border={cardBorder} text={textColor} />
      </div>
    </div>
  );
}

function GameCard({ title, icon, onClick, bg, border, text }) {
  return (
    <div onClick={onClick} style={{ backgroundColor: bg, border: `1px solid ${border}`, padding: '30px 10px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
      <h3 style={{ margin: 0, color: text, fontSize: '16px' }}>{title}</h3>
    </div>
  );
}

// --- GAMES (kept the same) ---
function CoinFlip({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [choice, setChoice] = useState('heads');
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null);

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setFlipping(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() < 0.5;
      const outcome = win ? choice : (choice === 'heads' ? 'tails' : 'heads');
      setResult({ win, outcome });
      await updateBalanceAndLog(bet, win ? bet * 2 : 0, "Coin Flip", win ? "won" : "lost");
      setFlipping(false);
    }, 1000);
  };

  return (
    <GameLayout title="Coin Flip" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setChoice('heads')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'heads' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>Heads</button>
        <button onClick={() => setChoice('tails')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'tails' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>Tails</button>
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={flipping} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{flipping ? 'Flipping...' : 'Flip!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>{result.win ? `Won! It was ${result.outcome}` : `Lost. It was ${result.outcome}`}</h3>}
    </GameLayout>
  );
}

function DiceRoller({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [choice, setChoice] = useState('high'); 
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setRolling(true); setResult(null);
    setTimeout(async () => {
      const roll = Math.floor(Math.random() * 100) + 1;
      const win = (choice === 'high' && roll > 50) || (choice === 'low' && roll <= 50);
      setResult({ win, roll });
      await updateBalanceAndLog(bet, win ? bet * 2 : 0, "Dice Roller", win ? "won" : "lost");
      setRolling(false);
    }, 1000);
  };

  return (
    <GameLayout title="Dice Roller" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setChoice('low')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'low' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>Low (1-50)</button>
        <button onClick={() => setChoice('high')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'high' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>High (51-100)</button>
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={rolling} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{rolling ? 'Rolling...' : 'Roll Dice!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>Rolled {result.roll}! {result.win ? 'You Won!' : 'You Lost'}</h3>}
    </GameLayout>
  );
}

function SpinWheel({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setSpinning(true); setResult(null);
    setTimeout(async () => {
      const rand = Math.random();
      let multiplier = 0;
      if (rand < 0.10) multiplier = 5;
      else if (rand < 0.20) multiplier = 2;
      else if (rand < 0.50) multiplier = 1;

      const win = multiplier > 0;
      setResult({ multiplier });
      await updateBalanceAndLog(bet, win ? bet * multiplier : 0, "Spin Wheel", win ? "won" : "lost");
      setSpinning(false);
    }, 1500);
  };

  return (
    <GameLayout title="Spin Wheel" gameBack={gameBack} userCoins={userCoins}>
      <p style={{ textAlign: 'center', color: '#666' }}>Win up to 5x your bet!</p>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={spinning} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{spinning ? 'Spinning...' : 'Spin!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.multiplier > 0 ? '#4caf50' : '#d32f2f' }}>{result.multiplier > 0 ? `You Won ${result.multiplier}x!` : 'You Lost'}</h3>}
    </GameLayout>
  );
}

function SlotMachine({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍋', '🔔']);
  
  const emojis = ['🍒', '🍋', '🔔', '💎'];

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setSpinning(true);
    const interval = setInterval(() => {
      setReels([emojis[Math.floor(Math.random()*4)], emojis[Math.floor(Math.random()*4)], emojis[Math.floor(Math.random()*4)]]);
    }, 100);

    setTimeout(async () => {
      clearInterval(interval);
      const finalReels = [emojis[Math.floor(Math.random()*4)], emojis[Math.floor(Math.random()*4)], emojis[Math.floor(Math.random()*4)]];
      setReels(finalReels);

      let winAmount = 0;
      if (finalReels[0] === '💎' && finalReels[1] === '💎' && finalReels[2] === '💎') winAmount = bet * 10;
      else if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) winAmount = bet * 3;
      else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) winAmount = bet * 1.5;

      await updateBalanceAndLog(bet, winAmount, "Slot Machine", winAmount > 0 ? "won" : "lost");
      setSpinning(false);
      if (winAmount > 0) toast.success(`You won ${winAmount} coins!`);
      else toast.error("No match, you lost!");
    }, 2000);
  };

  return (
    <GameLayout title="Slot Machine" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '50px', marginBottom: '30px', backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px' }}>
        {reels.map((r, i) => <span key={i}>{r}</span>)}
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={spinning} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{spinning ? 'Spinning...' : 'Spin Slots!'}</button>
    </GameLayout>
  );
}

function Plinko({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState(null);

  const multipliers = [5, 2, 1.5, 1, 0.5, 1, 1.5, 2, 5];

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setDropping(true); setResult(null);
    setTimeout(async () => {
      const rand = Math.random() + Math.random() + Math.random();
      const index = Math.floor((rand / 3) * multipliers.length);
      const mult = multipliers[index];
      
      const winAmount = bet * mult;
      setResult(mult);
      await updateBalanceAndLog(bet, winAmount, "Plinko Drop", winAmount >= bet ? "won" : "lost");
      setDropping(false);
    }, 2000);
  };

  return (
    <GameLayout title="Plinko Drop" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', opacity: dropping ? 0.5 : 1 }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#d32f2f' }}></div>
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={dropping} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{dropping ? 'Dropping...' : 'Drop Ball!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result >= 1 ? '#4caf50' : '#d32f2f' }}>Landed on {result}x!</h3>}
    </GameLayout>
  );
}

function LuckyNumber({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [guess, setGuess] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);

  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setRolling(true); setResult(null);
    setTimeout(async () => {
      const number = Math.floor(Math.random() * 10) + 1;
      const win = number === guess;
      setResult({ number, win });
      await updateBalanceAndLog(bet, win ? bet * 10 : 0, "Lucky Number", win ? "won" : "lost");
      setRolling(false);
    }, 1000);
  };

  return (
    <GameLayout title="Lucky Number" gameBack={gameBack} userCoins={userCoins}>
      <p style={{ textAlign: 'center', color: '#666' }}>Pick a number (1-10) to win 10x!</p>
      <input type="number" min="1" max="10" value={guess} onChange={e => setGuess(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
      <button onClick={play} disabled={rolling} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{rolling ? 'Rolling...' : 'Try Your Luck!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>Result: {result.number}. {result.win ? 'JACKPOT!' : 'Try again'}</h3>}
    </GameLayout>
  );
}

function GameLayout({ title, gameBack, userCoins, children }) {
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', color: 'inherit' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: 'inherit' }}>← Back to Hub</button>
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: '5px 0 0 0' }}>Balance: 🪙 {userCoins}</p>
      </div>
      {children}
    </div>
  );
}
