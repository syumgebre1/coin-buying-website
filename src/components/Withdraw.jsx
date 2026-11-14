import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';

export default function Withdraw() {
  const navigate = useNavigate();
  const { darkMode } = useContext(ThemeContext);
  
  const [userCoins, setUserCoins] = useState(0);
  const [coinRate, setCoinRate] = useState(10); 
  const [feePercentage, setFeePercentage] = useState(10); // Default
  const [banks, setBanks] = useState([]);
  
  const [amountToWithdraw, setAmountToWithdraw] = useState(''); 
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) setUserCoins(userDoc.data().coins || 0);

      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setCoinRate(data.coinRate || 10);
        setFeePercentage(data.withdrawalFeePercentage !== undefined ? data.withdrawalFeePercentage : 10);
        setBanks(data.banks || []);
        if (data.banks?.length > 0) setSelectedBank(data.banks[0].id);
      }
    };
    fetchData();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const coins = Number(amountToWithdraw);
    if (coins < 100) return toast.error("Minimum withdrawal is 100 Coins.");
    if (coins > userCoins) return toast.error("Insufficient balance.");

    setLoading(true);
    try {
      const activeBank = banks.find(b => b.id === selectedBank);
      const feeInCoins = Math.floor(coins * (feePercentage / 100));
      const netCoins = coins - feeInCoins;
      const totalBirr = netCoins / coinRate;

      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { coins: userCoins - coins });

      await addDoc(collection(db, "withdrawals"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        coinsDeducted: coins,
        feeCoins: feeInCoins,
        etbAmount: totalBirr,
        bankName: activeBank?.name || 'Unknown',
        accountNo: accountNumber,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast.success(`Withdrawal requested! You will receive ${totalBirr.toFixed(2)} Birr.`);
      navigate('/dashboard');
    } catch (error) {
      toast.error("Error processing withdrawal.");
    }
    setLoading(false);
  };

  const parsedCoins = Number(amountToWithdraw) || 0;
  const displayFee = Math.floor(parsedCoins * (feePercentage / 100));
  const displayNet = parsedCoins - displayFee;
  const displayBirr = displayNet / coinRate;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>Withdraw Funds</h2>
      <div style={{ padding: '20px', backgroundColor: '#1a237e', color: 'white', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>Balance: 🪙 {userCoins}</h3>
      </div>

      <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="number" value={amountToWithdraw} onChange={e => setAmountToWithdraw(e.target.value)} placeholder="Coins to withdraw" style={{ padding: '12px' }} />

        {parsedCoins > 0 && (
          <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
            <p>Fee ({feePercentage}%): -{displayFee} Coins</p>
            <p>You Receive: <strong>{displayBirr.toFixed(2)} Birr</strong></p>
          </div>
        )}

        <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} style={{ padding: '12px' }}>
          {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number" style={{ padding: '12px' }} />

        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#f57c00', color: 'white' }}>
          {loading ? 'Processing...' : 'Withdraw'}
        </button>
      </form>
    </div>
  );
}
