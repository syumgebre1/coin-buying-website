import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs , Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ThemeContext } from '../ThemeContext';


// Feature #5: 24-hour withdrawal lock
const WITHDRAWAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function checkWithdrawalLock(userId) {
  const { getDoc, doc } = await import('firebase/firestore');
  const { db } = await import('../firebaseConfig');
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return { allowed: true };
  const last = snap.data().lastWithdrawalAt;
  if (!last) return { allowed: true };
  const lastMs = last?.toMillis ? last.toMillis() : new Date(last).getTime();
  const remaining = WITHDRAWAL_COOLDOWN_MS - (Date.now() - lastMs);
  if (remaining > 0) {
    const hrs = Math.ceil(remaining / 3600000);
    return { allowed: false, message: `You can withdraw again in ${hrs}h.` };
  }
  return { allowed: true };
}


export default function Withdraw() {
  const navigate = useNavigate();
  const [userCoins, setUserCoins] = useState(0);
  const [coinRate, setCoinRate] = useState(10);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [amountToWithdraw, setAmountToWithdraw] = useState(100);
  const [enteredPin, setEnteredPin] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserCoins(userDoc.data().coins || 0);
        setSavedPin(userDoc.data().withdrawPin || '');
      }
      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) setCoinRate(settingsDoc.data().coinRate || 10);
    };
    fetchData();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!savedPin) return toast.error("Please set a Withdrawal PIN in your Profile first.");
    if (enteredPin !== savedPin) return toast.error("Incorrect PIN. Access denied.");
    if (amountToWithdraw > userCoins) return toast.error("Not enough coins!");
    if (amountToWithdraw < 50) return toast.error("Minimum withdrawal is 50 coins.");
    if (!bankName || !accountNo) return toast.error("Please enter bank details.");

    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { coins: userCoins - amountToWithdraw });
      setUserCoins(userCoins - amountToWithdraw);

      // FRAUD DETECTION CHECK
      const wdCheckQuery = query(collection(db, "withdrawals"), where("userId", "==", auth.currentUser.uid));
      const wdCheckSnap = await getDocs(wdCheckQuery);
      const userWithdrawalsToday = wdCheckSnap.docs.filter(d => new Date(d.data().createdAt).toDateString() === new Date().toDateString()).length;

      await addDoc(collection(db, "withdrawals"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        coinsDeducted: amountToWithdraw,
        etbAmount: amountToWithdraw / coinRate,
        bankName: bankName,
        accountNo: accountNo,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        amount: amountToWithdraw / coinRate,
        coins: amountToWithdraw,
        method: `Withdraw to ${bankName}`,
        status: 'pending',
        receiptUrl: '',
        createdAt: new Date().toISOString()
      });

      // NOTIFY ADMINS + FRAUD ALERT
      const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnap = await getDocs(adminQuery);
      const adminNotifs = [];
      adminSnap.forEach((adminDoc) => {
        adminNotifs.push(addDoc(collection(db, "notifications"), {
          userId: adminDoc.id,
          message: `💸 Withdrawal request for ${amountToWithdraw / coinRate} ETB from ${auth.currentUser.email}`,
          type: 'admin_alert', read: false, createdAt: new Date().toISOString()
        }));
        
        // Fraud alert
        if (userWithdrawalsToday >= 2) {
          adminNotifs.push(addDoc(collection(db, "notifications"), {
            userId: adminDoc.id,
            message: `🚨 FRAUD ALERT: ${auth.currentUser.email} has requested ${userWithdrawalsToday + 1} withdrawals today!`,
            type: 'fraud_alert', read: false, createdAt: new Date().toISOString()
          }));
        }
      });
      await Promise.all(adminNotifs);

      toast.success("Withdrawal request submitted!");
      setBankName(''); setAccountNo(''); setAmountToWithdraw(100); setEnteredPin('');
    } catch (error) { toast.error("Error processing withdrawal."); }
    setLoading(false);
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>Withdraw to ETB</h2>
        <p style={{ margin: '10px 0 0 0' }}>Balance: 🪙 {userCoins} Coins</p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.8 }}>Current Rate: 1 Coin = {1/coinRate} Birr</p>
      </div>

      <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${cardBorder}` }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Coins to Withdraw (Min 50)</label>
          <input type="number" value={amountToWithdraw} onChange={(e) => setAmountToWithdraw(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor }} />
          <small style={{ color: '#4caf50', fontWeight: 'bold' }}>You will receive: {amountToWithdraw / coinRate} ETB</small>
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Security PIN</label>
          <input type="password" maxLength="4" value={enteredPin} onChange={(e) => setEnteredPin(e.target.value)} placeholder="Enter 4-digit PIN" required style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor }} />
        </div>
        
        <div>
          <label style={{ fontWeight: 'bold' }}>Bank Name</label>
          <select value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor }}>
            <option value="">Select Bank...</option>
            <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
            <option value="Awash">Awash Bank</option>
            <option value="Wegagen">Wegagen Bank</option>
            <option value="Telebirr">TeleBirr</option>
            <option value="M-PESA">M-PESA</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Account Number / Phone</label>
          <input type="text" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="1000..." style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: `1px solid ${cardBorder}`, backgroundColor: darkMode ? '#121212' : 'white', color: textColor }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
          {loading ? 'Processing...' : 'Request Withdrawal'}
        </button>
      </form>
    </div>
  );
}
