import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';
import { fireConfetti } from '../utils/confetti';

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
        userId: auth.currentUser.uid, userEmail: auth.currentUser.email,
        amount: 0, coins: betAmount, method: gameName, status: status,
        winAmount: winAmount, receiptUrl: '', createdAt: new Date().toISOString()
      });

      if (status === 'won' && winAmount > betAmount) fireConfetti();
    } catch (error) { toast.error("Error updating balance."); }
  };

  if (activeGame === 'coinflip') return <CoinFlip gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'dice') return <DiceRoller gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'wheel') return <SpinWheel gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'slots') return <SlotMachine gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'plinko') return <Plinko gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'guess') return <LuckyNumber gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'mines') return <Mines gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;
  if (activeGame === 'aviator') return <Aviator gameBack={() => setActiveGame(null)} userCoins={userCoins} updateBalanceAndLog={updateBalanceAndLog} />;

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
        <GameCard title="Slot Machine" icon="🎰" onClick={() => setActiveGame('slots')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Spin Wheel" icon="🎡" onClick={() => setActiveGame('wheel')} bg={cardBg} border={cardBorder} text={textColor} />
        <GameCard title="Dice Roller" icon="🎲" onClick={() => setActiveGame('dice')} bg={cardBg} border={cardBorder} text={textColor} />
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

// --- THE AVIATOR GAME ---
function Aviator({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.00);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [message, setMessage] = useState('');
  const intervalRef = useRef(null);

  const startGame = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    setIsPlaying(true);
    setCrashed(false);
    setMultiplier(1.00);
    setMessage('');

    // Crash point is calculated with house edge (approx 5% instant crash, max 10x)
    const crashPoint = (Math.random() < 0.05) ? 1.00 : (Math.random() * 8 + 1.2).toFixed(2);
    
    intervalRef.current = setInterval(() => {
      setMultiplier(prev => {
        const newMult = prev + 0.05;
        if (newMult >= Number(crashPoint)) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          setCrashed(true);
          setMessage(`Crashed at ${crashPoint}x! You lost.`);
          updateBalanceAndLog(bet, 0, "Aviator", "lost");
          return Number(crashPoint);
        }
        return newMult;
      });
    }, 100);
  };

  const cashOut = () => {
    if (!isPlaying) return;
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    const winAmount = Math.floor(bet * multiplier);
    setMessage(`Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount} coins!`);
    updateBalanceAndLog(bet, winAmount, "Aviator", "won");
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <GameLayout title="Aviator ✈️" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ backgroundColor: '#1e293b', padding: '0', borderRadius: '12px', marginBottom: '20px', position: 'relative', overflow: 'hidden', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Background Grid */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(#2a3441 1px, transparent 1px), linear-gradient(90deg, #2a3441 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3 }}></div>

        {/* The Flying Plane (Curved Path) */}
        <div style={{
          position: 'absolute',
          bottom: `${Math.min((multiplier - 1) * 12, 80)}%`, 
          left: `${Math.min(Math.pow(multiplier - 1, 1.5) * 15, 80)}%`,
          fontSize: '40px',
          transition: 'all 0.1s linear',
          transform: crashed ? 'rotate(90deg) translateY(-20px)' : 'none',
          opacity: crashed ? 0 : 1,
          zIndex: 5
        }}>
          ✈️
        </div>

        {/* Text Overlay */}
        <div style={{ zIndex: 10, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '60px', color: crashed ? '#ef4444' : (isPlaying ? '#4caf50' : 'white'), transition: 'color 0.3s', textShadow: '0px 4px 10px rgba(0,0,0,0.8)' }}>
            {multiplier.toFixed(2)}x
          </h1>
          {isPlaying && <p style={{ color: '#4caf50', margin: '10px 0 0 0', fontWeight: 'bold' }}>Flying...</p>}
          {crashed && <p style={{ color: '#ef4444', margin: '10px 0 0 0', fontWeight: 'bold', fontSize: '20px' }}>FLEW AWAY!</p>}
        </div>
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

function Mines({ gameBack, userCoins, updateBalanceAndLog }) {
  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [grid, setGrid] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  const startGame = () => {
    if (bet > userCoins || bet <= 0) return toast.error("Invalid bet");
    const newGrid = Array(25).fill('diamond');
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const idx = Math.floor(Math.random() * 25);
      if (newGrid[idx] !== 'mine') { newGrid[idx] = 'mine'; minesPlaced++; }
    }
    setGrid(newGrid); setRevealed([]); setIsPlaying(true); setGameOver(false); setMultiplier(1);
  };

  const revealCell = (index) => {
    if (!isPlaying || revealed.includes(index)) return;
    const newRevealed = [...revealed, index];
    setRevealed(newRevealed);

    if (grid[index] === 'mine') {
      setIsPlaying(false); setGameOver(true);
      setRevealed(grid.map((_, i) => i)); 
      updateBalanceAndLog(bet, 0, "Mines", "lost");
      toast.error("BOOM! You hit a mine.");
    } else {
      const safeRevealed = newRevealed.length;
      const newMultiplier = (1 + (safeRevealed * (mineCount / (25 - safeRevealed)))).toFixed(2);
      setMultiplier(Number(newMultiplier));
      if (safeRevealed === 25 - mineCount) cashOut(newMultiplier);
    }
  };

  const cashOut = async (currentMultiplier) => {
    const winAmount = Math.floor(bet * currentMultiplier);
    setIsPlaying(false);
    await updateBalanceAndLog(bet, winAmount, "Mines", "won");
    toast.success(`Cashed out ${winAmount} Coins!`);
  };

  return (
    <GameLayout title="Mines 💣" gameBack={gameBack} userCoins={userCoins}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Bet</label>
          <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} disabled={isPlaying} style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Mines</label>
          <select value={mineCount} onChange={e => setMineCount(Number(e.target.value))} disabled={isPlaying} style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            {[1, 3, 5, 10, 24].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Multiplier</label>
          <h3 style={{ margin: 0, color: '#4caf50' }}>{multiplier}x</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {Array(25).fill(0).map((_, i) => {
          const isRevealed = revealed.includes(i);
          const isMine = grid[i] === 'mine';
          return (
            <button key={i} onClick={() => revealCell(i)} disabled={!isPlaying || isRevealed}
              style={{ height: '50px', borderRadius: '8px', border: 'none', backgroundColor: isRevealed ? (isMine ? '#d32f2f' : '#4caf50') : (isPlaying ? '#1a237e' : '#e0e0e0'), color: 'white', fontSize: '20px', cursor: (isPlaying && !isRevealed) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRevealed ? (isMine ? '💣' : '💎') : ''}
            </button>
          );
        })}
      </div>

      {!isPlaying && !gameOver && <button onClick={startGame} style={{ width: '100%', padding: '15px', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Start Game</button>}
      {isPlaying && <button onClick={() => cashOut(multiplier)} style={{ width: '100%', padding: '15px', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Cash Out ({Math.floor(bet * multiplier)} Coins)</button>}
      {gameOver && <button onClick={startGame} style={{ width: '100%', padding: '15px', backgroundColor: '#d32f2f', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Play Again</button>}
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
