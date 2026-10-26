import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fireConfetti } from '../utils/confetti';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [coinRate, setCoinRate] = useState(10);
  const [banks, setBanks] = useState([]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]); 
  const [promos, setPromos] = useState([]);
  const [tickets, setTickets] = useState([]); 
  const [isMaintenance, setIsMaintenance] = useState(false); // Maintenance Mode
  
  const [chats, setChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoCoins, setPromoCoins] = useState(50);

  const fetchData = async () => {
    const settingsDoc = await getDoc(doc(db, "settings", "config"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      setCoinRate(data.coinRate || 10);
      setBanks(data.banks || []);
      setIsMaintenance(data.maintenance || false);
    }
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    setUsers(usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    
    const txSnapshot = await getDocs(collection(db, "transactions"));
    const sortedTx = txSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    setTransactions(sortedTx);

    const wdSnapshot = await getDocs(collection(db, "withdrawals"));
    const sortedWd = wdSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    setWithdrawals(sortedWd);

    const promoSnapshot = await getDocs(collection(db, "promos"));
    setPromos(promoSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

    const ticketSnapshot = await getDocs(collection(db, "lottery_tickets"));
    setTickets(ticketSnapshot.docs.map(d => d.data()));
  };

  useEffect(() => { 
    fetchData(); 
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const toggleMaintenance = async () => {
    const newVal = !isMaintenance;
    await setDoc(doc(db, "settings", "config"), { maintenance: newVal }, { merge: true });
    setIsMaintenance(newVal);
    toast.success(newVal ? "App is now in Maintenance Mode" : "App is live again!");
  };

  const sendAnnouncement = async () => {
    const msg = prompt("Enter announcement message for all users:");
    if (msg) {
      await addDoc(collection(db, "announcements"), { message: msg, createdAt: new Date().toISOString() });
      toast.success("Announcement sent!");
      toast.success("Announcement sent to all users!");
    }
  };

  const drawLotteryWinner = async () => {
    if (tickets.length === 0) return toast.error("No tickets sold yet!");
    if (!window.confirm(`Are you sure? This will randomly pick 1 winner from ${tickets.length} tickets.`)) return;

    const winner = tickets[Math.floor(Math.random() * tickets.length)];
    
    try {
      const userRef = doc(db, "users", winner.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCoins = userSnap.data().coins || 0;
        const prize = tickets.length * 50;
        await updateDoc(userRef, { coins: currentCoins + prize });
        toast.success(`Winner: ${winner.userEmail} won ${prize} Coins!`);
        fireConfetti();
        setTickets([]); 
      }
    } catch (e) { toast.error("Error drawing winner."); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUser) return;
    await addDoc(collection(db, "chats"), {
      userId: selectedUser.id,
      userEmail: selectedUser.email,
      sender: 'admin',
      text: replyText,
      createdAt: new Date().toISOString()
    });
    setReplyText('');
  };

  const editUserBalance = async (user) => {
    const pass = prompt("Enter your admin password to proceed:");
    if (pass !== "admin123") return toast.error("Incorrect password!");
    
    const newBalanceStr = prompt(`Current balance for ${user.email} is ${user.coins || 0}.\nEnter new balance:`, user.coins || 0);
    if (newBalanceStr !== null) {
      const newBalance = Number(newBalanceStr);
      if (!isNaN(newBalance)) {
        await updateDoc(doc(db, "users", user.id), { coins: newBalance });
        toast.success("User balance updated!");
        fetchData();
      }
    }
  };

  const deletePromo = async (id) => {
    if(window.confirm("Are you sure you want to delete this promo code?")) {
      await deleteDoc(doc(db, "promos", id));
      toast.success("Promo code deleted.");
      fetchData();
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalRevenue = transactions.filter(t => t.status === 'completed' && t.amount > 0 && !t.method.includes('Withdraw')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalCoinsSold = transactions.filter(t => t.status === 'completed' && t.amount > 0 && !t.method.includes('Withdraw')).reduce((sum, t) => sum + (Number(t.coins) || 0), 0);
  const chartData = transactions.filter(t => t.status === 'completed' && t.amount > 0).slice(0, 10).reverse().map((tx, i) => ({ name: `Tx ${i+1}`, revenue: tx.amount }));

  const saveSettings = async () => {
    await setDoc(doc(db, "settings", "config"), { coinRate, banks, maintenance: isMaintenance });
    toast.success('Settings saved!');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <button onClick={sendAnnouncement} style={{ marginTop: '5px', padding: '5px 10px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📢 Send Announcement</button>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Site</button>
      </div>

      {/* MAINTENANCE MODE TOGGLE */}
      <div style={{ backgroundColor: isMaintenance ? '#ffebee' : '#e8f5e9', border: `1px solid ${isMaintenance ? '#ef9a9a' : '#a5d6a7'}`, padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: isMaintenance ? '#c62828' : '#2e7d32' }}>System Maintenance Mode</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>If enabled, regular users cannot access the app.</p>
        </div>
        <button onClick={toggleMaintenance} style={{ padding: '10px 20px', backgroundColor: isMaintenance ? '#4caf50' : '#d32f2f', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isMaintenance ? 'Turn OFF (Go Live)' : 'Turn ON (Maintenance)'}
        </button>
      </div>

      {/* METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px', border: '1px solid #a5d6a7', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold' }}>Total Revenue</p>
          <h1 style={{ margin: '10px 0', color: '#1b5e20', fontSize: '32px' }}>{totalRevenue.toLocaleString()} Birr</h1>
        </div>
        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '1px solid #90caf9', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#1565c0', fontWeight: 'bold' }}>Total Coins Sold</p>
          <h1 style={{ margin: '10px 0', color: '#0d47a1', fontSize: '32px' }}>🪙 {totalCoinsSold.toLocaleString()}</h1>
        </div>
      </div>

      {/* CHART */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Revenue Analytics (Last 10 Sales)</h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={3} /></LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOTTERY */}
      <div style={{ border: '2px solid #f57c00', padding: '20px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff3e0' }}>
        <h3 style={{ color: '#ef6c00', margin: '0 0 10px 0' }}>🎰 Weekly Lottery Draw</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Tickets Sold: <strong>{tickets.length}</strong> | Current Jackpot: <strong>{tickets.length * 50} Coins</strong></p>
        <button onClick={drawLotteryWinner} style={{ padding: '10px 20px', backgroundColor: '#ef6c00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Draw Random Winner</button>
      </div>

      {/* REST OF THE DASHBOARD (Users, Withdrawals, Chats, etc.) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
         {/* ... Paste your Global Settings & Users tables here ... */}
      </div>
    </div>
  );
}
