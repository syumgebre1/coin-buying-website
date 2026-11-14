import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';

const DEFAULT_ODDS = {
  aviatorMax: 10, coinflip: 40, mines: 100, plinko: 50, slots: 20, wheel: 40, dice: 50, lucky: 10
};

export default function CasinoHub() {
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  const [activeGame, setActiveGame] = useState(null);
  const [userCoins, setUserCoins] = useState(0);
  const [adminOdds, setAdminOdds] = useState(DEFAULT_ODDS);

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

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "game_odds"), (docSnap) => {
      if (docSnap.exists()) setAdminOdds(prev => ({ ...prev, ...docSnap.data() }));
    });
    return () => unsub();
  }, []);

  const updateBalanceAndLog = async (betAmount, winAmount, gameName, status) => {
    try {
      if (!auth.currentUser) return;
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      const newBalance = currentCoins - betAmount + winAmount;
      await updateDoc(userRef, { coins: newBalance });
      setUserCoins(newBalance);
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid, userEmail: auth.currentUser.email,
        amount: 0, coins: betAmount, method: gameName, status: status,
        winAmount: winAmount, createdAt: new Date().toISOString()
      });
    } catch (error) { toast.error("Error updating balance."); }
  };

  if (activeGame === 'aviator') return <Aviator maxMultiplier={adminOdds.aviatorMax} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'mines') return <Mines winRate={adminOdds.mines} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'coinflip') return <CoinFlip winRate={adminOdds.coinflip} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'plinko') return <Plinko winRate={adminOdds.plinko} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'slots') return <Slots winRate={adminOdds.slots} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'wheel') return <Wheel winRate={adminOdds.wheel} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'dice') return <Dice winRate={adminOdds.dice} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'lucky') return <Lucky winRate={adminOdds.lucky} gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>Casino Hub</h2>
        <p style={{ margin: '10px 0 0 0' }}>Balance: 🪙 {userCoins} Coins</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <GameCard title="Aviator" icon="✈️" onClick={() => setActiveGame('aviator')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Mines" icon="💣" onClick={() => setActiveGame('mines')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Coin Flip" icon="🪙" onClick={() => setActiveGame('coinflip')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Plinko Drop" icon="⚪" onClick={() => setActiveGame('plinko')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Slots" icon="🎰" onClick={() => setActiveGame('slots')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Spin Wheel" icon="🎡" onClick={() => setActiveGame('wheel')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Dice Roller" icon="🎲" onClick={() => setActiveGame('dice')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Lucky Number" icon="🔢" onClick={() => setActiveGame('lucky')} bg={cardBg} border={cardBorder} text={textColor} />
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

// 1. AVIATOR (Now uses maxMultiplier from Admin)
function Aviator({ maxMultiplier, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.00);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [message, setMessage] = useState('');
  const intervalRef = useRef(null);

  const startGame = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setIsPlaying(true); setCrashed(false); setMultiplier(1.00); setMessage('');
    
    // The crash point is now limited by the Admin's maxMultiplier
    const crashPoint = (Math.random() * (maxMultiplier - 1) + 1).toFixed(2);
    
    intervalRef.current = setInterval(() => {
      setMultiplier(prev => {
        const newMult = prev + 0.05;
        if (newMult >= Number(crashPoint)) {
          clearInterval(intervalRef.current); setIsPlaying(false); setCrashed(true);
          setMessage(`Crashed at ${crashPoint}x! You lost.`); updateBalanceAndLog(bet, 0, "Aviator", "lost");
          return Number(crashPoint);
        }
        return newMult;
      });
    }, 100);
  };

  const cashOut = () => {
    if (!isPlaying) return;
    clearInterval(intervalRef.current); setIsPlaying(false);
    const winAmount = Math.floor(bet * multiplier);
    setMessage(`Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount} coins!`);
    updateBalanceAndLog(bet, winAmount, "Aviator", "won");
  };

  useEffect(() => { return () => clearInterval(intervalRef.current); }, []);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: '#333' }}>← Back</button>
      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', marginBottom: '20px', position: 'relative', overflow: 'hidden', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#2a3441 1px, transparent 1px), linear-gradient(90deg, #2a3441 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3 }}></div>
        <div style={{ position: 'absolute', bottom: `${Math.min((multiplier - 1) * 12, 80)}%`, left: `${Math.min(Math.pow(multiplier - 1, 1.5) * 15, 80)}%`, fontSize: '40px', transition: 'all 0.1s linear', transform: crashed ? 'rotate(90deg) translateY(-20px)' : 'none', opacity: crashed ? 0 : 1, zIndex: 5 }}>✈️</div>
        <div style={{ zIndex: 10, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '60px', color: crashed ? '#ef4444' : (isPlaying ? '#4caf50' : 'white'), textShadow: '0px 4px 10px rgba(0,0,0,0.8)' }}>{multiplier.toFixed(2)}x</h1>
          {isPlaying && <p style={{ color: '#4caf50', margin: '10px 0 0 0', fontWeight: 'bold' }}>Flying...</p>}
          {crashed && <p style={{ color: '#ef4444', margin: '10px 0 0 0', fontWeight: 'bold', fontSize: '20px' }}>FLEW AWAY!</p>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {!isPlaying && !crashed && <><input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} /><button onClick={startGame} style={{ ...styles.btn, backgroundColor: '#4caf50' }}>Place Bet & Fly</button></>}
        {isPlaying && <button onClick={cashOut} style={{ ...styles.btn, backgroundColor: '#f57c00', fontSize: '20px' }}>CASH OUT ({Math.floor(bet * multiplier)} Coins)</button>}
        {crashed && <button onClick={() => setCrashed(false)} style={{ ...styles.btn, backgroundColor: '#1a237e' }}>Play Again</button>}
        {message && <p style={{ textAlign: 'center', color: crashed ? '#ef4444' : '#4caf50', fontWeight: 'bold' }}>{message}</p>}
      </div>
    </div>
  );
}

// ... (The rest of the games stay exactly the same as the previous block)
function Mines({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [isPlaying, setIsPlaying] = useState(false);
  const [mines, setMines] = useState([]); const [revealed, setRevealed] = useState([]);
  const [status, setStatus] = useState('idle');
  const startGame = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setIsPlaying(true); setStatus('idle'); setRevealed([]);
    const newMines = []; const mineCount = Math.max(1, Math.floor((100 - winRate) / 20)); 
    while(newMines.length < mineCount) { const r = Math.floor(Math.random() * 9); if(!newMines.includes(r)) newMines.push(r); }
    setMines(newMines);
  };
  const clickCell = (index) => {
    if(!isPlaying || revealed.includes(index)) return;
    if(mines.includes(index)) { setStatus('lost'); setIsPlaying(false); updateBalanceAndLog(bet, 0, "Mines", "lost"); } 
    else {
      const newRevealed = [...revealed, index]; setRevealed(newRevealed);
      if(newRevealed.length === 9 - mines.length) { setStatus('won'); setIsPlaying(false); updateBalanceAndLog(bet, Math.floor(bet * 2), "Mines", "won"); }
    }
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {Array(9).fill(0).map((_, i) => (
          <button key={i} onClick={() => clickCell(i)} style={{ height: '60px', fontSize: '24px', borderRadius: '8px', border: 'none', backgroundColor: revealed.includes(i) ? (mines.includes(i) ? '#ef4444' : '#4caf50') : '#1e293b', cursor: 'pointer' }}>
            {revealed.includes(i) ? (mines.includes(i) ? '💣' : '💎') : ''}
          </button>
        ))}
      </div>
      {!isPlaying ? <button onClick={startGame} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>Start Game ({bet} coins)</button> : <button style={{ ...styles.btn, backgroundColor: '#ef4444' }}>Cash Out</button>}
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
    </div>
  );
}

function CoinFlip({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [choice, setChoice] = useState('heads'); const [flipping, setFlipping] = useState(false); const [result, setResult] = useState(null);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setFlipping(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate; const outcome = win ? choice : (choice === 'heads' ? 'tails' : 'heads');
      setResult({ win, outcome }); await updateBalanceAndLog(bet, win ? bet * 2 : 0, "Coin Flip", win ? "won" : "lost"); setFlipping(false);
    }, 1000);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setChoice('heads')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'heads' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>Heads</button>
        <button onClick={() => setChoice('tails')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: choice === 'tails' ? '2px solid #1a237e' : '1px solid #ccc', fontWeight: 'bold' }}>Tails</button>
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={flipping} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{flipping ? 'Flipping...' : 'Flip!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>{result.win ? `Won! It was ${result.outcome}` : `Lost. It was ${result.outcome}`}</h3>}
    </div>
  );
}

// ... (Include Plinko, Slots, Wheel, Dice, Lucky here as they were in the previous block)
function Plinko({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [dropping, setDropping] = useState(false); const [result, setResult] = useState(null);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setDropping(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate; const mult = win ? 2 : 0;
      setResult(mult); await updateBalanceAndLog(bet, bet * mult, "Plinko", mult > 0 ? "won" : "lost"); setDropping(false);
    }, 1500);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', transform: dropping ? 'translateY(180px)' : 'none', transition: 'transform 1.5s ease-in' }}></div>
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={dropping} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{dropping ? 'Dropping...' : 'Drop Ball!'}</button>
      {result !== null && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result > 0 ? '#4caf50' : '#d32f2f' }}>{result > 0 ? `Landed on ${result}x!` : 'You lost.'}</h3>}
    </div>
  );
}

function Slots({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [spinning, setSpinning] = useState(false); const [reels, setReels] = useState(['🍒', '🍋', '🔔']);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setSpinning(true);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate;
      if(win) { setReels(['💎', '💎', '💎']); updateBalanceAndLog(bet, bet * 5, "Slots", "won"); }
      else { setReels(['🍒', '🍋', '🔔']); updateBalanceAndLog(bet, 0, "Slots", "lost"); }
      setSpinning(false);
    }, 1000);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '50px', marginBottom: '30px', backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px' }}>
        {reels.map((r, i) => <span key={i}>{spinning ? '❓' : r}</span>)}
      </div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={spinning} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{spinning ? 'Spinning...' : 'Spin!'}</button>
    </div>
  );
}

function Wheel({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [spinning, setSpinning] = useState(false); const [result, setResult] = useState(null);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setSpinning(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate; const mult = win ? 2 : 0;
      setResult(mult); await updateBalanceAndLog(bet, bet * mult, "Wheel", mult > 0 ? "won" : "lost"); setSpinning(false);
    }, 1000);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'center', fontSize: '80px', marginBottom: '30px' }}>🎡</div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={spinning} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{spinning ? 'Spinning...' : 'Spin!'}</button>
      {result !== null && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result > 0 ? '#4caf50' : '#d32f2f' }}>{result > 0 ? `You Won ${result}x!` : 'You Lost'}</h3>}
    </div>
  );
}

function Dice({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [rolling, setRolling] = useState(false); const [result, setResult] = useState(null);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setRolling(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate; const num = win ? 6 : Math.floor(Math.random() * 5) + 1;
      setResult({ num, win }); await updateBalanceAndLog(bet, win ? bet * 2 : 0, "Dice", win ? "won" : "lost"); setRolling(false);
    }, 1000);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'center', fontSize: '80px', marginBottom: '30px' }}>🎲</div>
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={rolling} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{rolling ? 'Rolling...' : 'Roll!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>Rolled {result.num}! {result.win ? 'Win!' : 'Lost'}</h3>}
    </div>
  );
}

function Lucky({ winRate, gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10); const [guess, setGuess] = useState(1); const [rolling, setRolling] = useState(false); const [result, setResult] = useState(null);
  const play = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setRolling(true); setResult(null);
    setTimeout(async () => {
      const win = Math.random() * 100 < winRate; const num = win ? guess : (guess === 1 ? 2 : 1);
      setResult({ num, win }); await updateBalanceAndLog(bet, win ? bet * 5 : 0, "Lucky", win ? "won" : "lost"); setRolling(false);
    }, 1000);
  };
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <button onClick={gameBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <p style={{ textAlign: 'center', color: '#666' }}>Pick a number!</p>
      <input type="number" min="1" max="10" value={guess} onChange={e => setGuess(Number(e.target.value))} style={styles.input} />
      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} style={styles.input} />
      <button onClick={play} disabled={rolling} style={{ ...styles.btn, backgroundColor: '#f57c00' }}>{rolling ? 'Checking...' : 'Play!'}</button>
      {result && <h3 style={{ textAlign: 'center', marginTop: '20px', color: result.win ? '#4caf50' : '#d32f2f' }}>Result: {result.num}. {result.win ? 'Jackpot!' : 'Lost'}</h3>}
    </div>
  );
}

const styles = {
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '15px', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }
};
