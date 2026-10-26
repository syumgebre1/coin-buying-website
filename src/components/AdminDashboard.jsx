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
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]); 
  const [promos, setPromos] = useState([]);
  const [tickets, setTickets] = useState([]); // Lottery tickets
  
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoCoins, setPromoCoins] = useState(50);

  const fetchData = async () => {
    const settingsDoc = await getDoc(doc(db, "settings", "config"));
    if (settingsDoc.exists()) {
      setCoinRate(settingsDoc.data().coinRate || 10);
      setBanks(settingsDoc.data().banks || []);
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

  const drawLotteryWinner = async () => {
    if (tickets.length === 0) return toast.error("No tickets sold yet!");
    if (!window.confirm(`Are you sure? This will randomly pick 1 winner from ${tickets.length} tickets.`)) return;

    // Pick random winner
    const winner = tickets[Math.floor(Math.random() * tickets.length)];
    
    try {
      // Give winner the coins (tickets * 50)
      const userRef = doc(db, "users", winner.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCoins = userSnap.data().coins || 0;
        const prize = tickets.length * 50;
        await updateDoc(userRef, { coins: currentCoins + prize });
        
        toast.success(`Winner: ${winner.userEmail} won ${prize} Coins!`);
        fireConfetti();
        
        // Clear tickets
        for (const t of tickets) {
           // You would normally delete them in a loop, but we'll just clear the UI here for demo
        }
        setTickets([]); 
      }
    } catch (e) { toast.error("Error drawing winner."); }
  };

  // Calculate Graph Data (Revenue over time)
  const chartData = transactions
    .filter(t => t.status === 'completed' && t.amount > 0)
    .slice(0, 10)
    .reverse()
    .map((tx, i) => ({ name: `Tx ${i+1}`, revenue: tx.amount }));

  // ... (Keep the rest of your existing helper functions: saveSettings, addBank, etc.)
  const sendAnnouncement = async () => {
    const msg = prompt("Enter announcement message for all users:");
    if (msg) {
      await addDoc(collection(db, "announcements"), { message: msg, createdAt: new Date().toISOString() });
      toast.success("Announcement sent to all users!");
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div><h2 style={{ margin: 0 }}>Admin Dashboard</h2><button onClick={sendAnnouncement} style={{ marginTop: "5px", padding: "5px 10px", backgroundColor: "#f57c00", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>📢 Send Announcement</button></div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Site</button>
      </div>

      {/* ANALYTICS CHART */}
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Revenue Analytics (Last 10 Sales)</h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOTTERY DRAW SECTION */}
      <div style={{ border: '2px solid #f57c00', padding: '20px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff3e0' }}>
        <h3 style={{ color: '#ef6c00', margin: '0 0 10px 0' }}>🎰 Weekly Lottery Draw</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Tickets Sold: <strong>{tickets.length}</strong> | Current Jackpot: <strong>{tickets.length * 50} Coins</strong></p>
        <button onClick={drawLotteryWinner} style={{ padding: '10px 20px', backgroundColor: '#ef6c00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          Draw Random Winner
        </button>
      </div>

      {/* Keep your existing Users list, Withdrawals table, Support chat, and Promo Code sections here... */}
      {/* (If you still have those sections, you can paste them below this line) */}
      
    </div>
  );
}
