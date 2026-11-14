import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, query, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [supportChats, setSupportChats] = useState([]);
  
  const [settings, setSettings] = useState({ coinRate: 10, maintenance: false, depositBonusEnabled: false, depositBonusPercentage: 50, withdrawalFeePercentage: 10 });
  const [gameOdds, setGameOdds] = useState({ aviatorMax: 10, coinflip: 40, mines: 100, plinko: 50, slots: 20, wheel: 40, dice: 50, lucky: 10 });
  const [tournament, setTournament] = useState({ active: false, prizePool: 5000, endDate: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newBalance, setNewBalance] = useState('');
  
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  const fetchAllData = async () => {
    try {
      // 1. Fetch Settings
      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
      
      const tourneyDoc = await getDoc(doc(db, "settings", "tournament"));
      if (tourneyDoc.exists()) setTournament(tourneyDoc.data());

      const oddsDoc = await getDoc(doc(db, "settings", "game_odds"));
      if (oddsDoc.exists()) setGameOdds(prev => ({ ...prev, ...oddsDoc.data() }));

      // 2. Fetch Data
      const usersSnap = await getDocs(query(collection(db, "users"), limit(100)));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const txSnap = await getDocs(query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(500)));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const wdSnap = await getDocs(query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(100)));
      setWithdrawals(wdSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Error loading admin data.");
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAllData(); 
  }, []);

  // Only start live support chat listener AFTER we confirm admin is loaded
  useEffect(() => {
    if (loading) return;
    const unsub = onSnapshot(query(collection(db, "support_chats"), orderBy("createdAt", "desc")), (snap) => {
      setSupportChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.log("Chat listener error (ignore if no chats):", err));
    return () => unsub();
  }, [loading]);

  const handleUpdateSettings = async () => { await setDoc(doc(db, "settings", "config"), settings, { merge: true }); toast.success("Settings saved!"); };
  const handleUpdateGameOdds = async () => { await setDoc(doc(db, "settings", "game_odds"), gameOdds, { merge: true }); toast.success("Odds saved!"); };
  const handleUpdateTournament = async () => { await setDoc(doc(db, "settings", "tournament"), tournament, { merge: true }); toast.success("Tournament updated!"); };

  const handleToggleBan = async (user) => {
    try { await updateDoc(doc(db, "users", user.id), { isBanned: !user.isBanned }); fetchAllData(); toast.success("User updated!"); } 
    catch (e) { toast.error("Error updating user."); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    try { await deleteDoc(doc(db, "users", user.id)); fetchAllData(); toast.success("User deleted!"); } 
    catch (e) { toast.error("Error deleting user."); }
  };

  const handleEditBalance = async () => {
    if (!selectedUser || !newBalance) return;
    try {
      await updateDoc(doc(db, "users", selectedUser.id), { coins: Number(newBalance) });
      toast.success(`Balance updated!`);
      setSelectedUser(null); fetchAllData();
    } catch (e) { toast.error("Error updating balance."); }
  };

  const handleApproveTx = async (tx) => {
    try {
      const userRef = doc(db, "users", tx.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        let coinsToAdd = tx.coins;
        if (settings.depositBonusEnabled && userData.hasDepositedBefore === false) {
           coinsToAdd += Math.floor(tx.coins * (settings.depositBonusPercentage / 100));
           await updateDoc(userRef, { hasDepositedBefore: true });
        }
        await updateDoc(userRef, { coins: (userData.coins || 0) + coinsToAdd });
        await updateDoc(doc(db, "transactions", tx.id), { status: 'completed' });
        toast.success(`Approved! Added ${coinsToAdd} coins.`);
        fetchAllData();
      }
    } catch (e) { toast.error("Error approving transaction."); }
  };

  const handleReplyChat = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeChatUser) return;
    try {
      await addDoc(collection(db, "support_chats"), {
        userId: activeChatUser.userId, userEmail: activeChatUser.userEmail,
        sender: 'admin', text: replyMessage, createdAt: new Date().toISOString()
      });
      setReplyMessage('');
    } catch (e) { toast.error("Error sending reply."); }
  };

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const calculateProfit = (daysBack) => {
    const cutoff = new Date(now.getTime() - (daysBack * oneDay));
    let profit = 0;
    transactions.forEach(tx => {
      if (tx.createdAt && new Date(tx.createdAt) >= cutoff && tx.status === 'completed' && tx.method !== 'deposit' && tx.method !== 'Card' && tx.amount === 0) {
        profit += ((tx.coins || 0) - (tx.winAmount || 0));
      }
    });
    withdrawals.forEach(wd => {
      if (wd.createdAt && new Date(wd.createdAt) >= cutoff && wd.status === 'paid') profit += ((wd.feeCoins || 0) / settings.coinRate);
    });
    return profit;
  };
  
  const dailyProfit = calculateProfit(1);
  const weeklyProfit = calculateProfit(7);
  const monthlyProfit = calculateProfit(30);

  const pendingDeposits = transactions.filter(tx => tx.status === 'pending' && tx.amount > 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const uniqueSupportUsers = [...new Map(supportChats.map(item => [item.userId, item])).values()];

  const sidebarStyle = isMobile ? {
    width: '250px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 1000, transition: 'transform 0.3s ease', transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', boxShadow: isMobileMenuOpen ? '2px 0 10px rgba(0,0,0,0.5)' : 'none'
  } : {
    width: '250px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column'
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Admin...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7f6', color: '#333' }}>
      
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', backgroundColor: '#1e293b', color: 'white', zIndex: 900, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: '#f59e0b', fontSize: '20px' }}>👑 Admin Panel</h2>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', fontSize: '28px', color: 'white', cursor: 'pointer' }}>☰</button>
        </div>
      )}

      {isMobile && isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}></div>
      )}

      <div style={sidebarStyle}>
        <div style={{ padding: '20px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#f59e0b', margin: 0 }}>👑 Admin</h2>
          {isMobile && <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'white' }}>✕</button>}
        </div>
        <nav style={{ flex: 1 }}>
          {['overview', 'financials', 'users', 'support', 'tournament', 'transactions', 'settings', 'games'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if(isMobile) setIsMobileMenuOpen(false); }} style={{ width: '100%', padding: '15px 20px', background: 'none', border: 'none', color: activeTab === tab ? '#f59e0b' : '#cbd5e1', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer' }}>
              {tab === 'financials' ? '💰 Profit & Loss' : tab === 'support' ? '🎧 Support Inbox' : tab === 'tournament' ? '🏆 Tournaments' : tab.toUpperCase()}
            </button>
          ))}
        </nav>
        <button onClick={() => navigate('/dashboard')} style={{ margin: '20px', padding: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Exit</button>
      </div>

      <div style={{ flex: 1, padding: isMobile ? '80px 15px 20px 15px' : '30px', overflowY: 'auto', width: '100%' }}>
        
        {activeTab === 'overview' && (
          <div>
            <h1>Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
                <p style={{ margin: 0, color: '#666' }}>Pending Deposits</p><h2>{pendingDeposits.length}</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #d32f2f' }}>
                <p style={{ margin: 0, color: '#666' }}>Pending Withdrawals</p><h2>{pendingWithdrawals.length}</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #1a237e' }}>
                <p style={{ margin: 0, color: '#666' }}>Total Users</p><h2>{users.length}</h2>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div>
            <h1>Financials & Profit</h1>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
                <p style={{ margin: 0, color: '#666' }}>Today's Profit</p><h2>{dailyProfit.toFixed(2)} Birr</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
                <p style={{ margin: 0, color: '#666' }}>This Week</p><h2>{weeklyProfit.toFixed(2)} Birr</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
                <p style={{ margin: 0, color: '#666' }}>This Month</p><h2>{monthlyProfit.toFixed(2)} Birr</h2>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
             <h1>Users (God Mode)</h1>
             <input type="text" placeholder="Search users..." onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} />
             <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px' }}>
               {users.filter(u => u.email.includes(searchQuery)).map(u => (
                 <div key={u.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', borderBottom: '1px solid #eee', padding: '15px 0', gap: '10px' }}>
                   <div>
                     <strong>@{u.username}</strong>
                     <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{u.email}</p>
                     <p style={{ margin: 0, fontWeight: 'bold', color: '#1a237e' }}>🪙 {u.coins} Coins</p>
                   </div>
                   <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                     <button onClick={() => { setSelectedUser(u); setNewBalance(u.coins); }} style={{ backgroundColor: '#1a237e', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', flex: 1 }}>Edit</button>
                     <button onClick={() => handleToggleBan(u)} style={{ backgroundColor: u.isBanned ? '#4caf50' : '#f59e0b', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', flex: 1 }}>{u.isBanned ? 'Unban' : 'Ban'}</button>
                     <button onClick={() => handleDeleteUser(u)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', flex: 1 }}>Del</button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div>
            <h1>Support Inbox</h1>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', height: isMobile ? 'auto' : '60vh' }}>
              <div style={{ width: isMobile ? '100%' : '300px', backgroundColor: 'white', borderRadius: '10px', overflowY: 'auto', maxHeight: isMobile ? '200px' : 'none' }}>
                {uniqueSupportUsers.map(u => (
                  <div key={u.userId} onClick={() => setActiveChatUser(u)} style={{ padding: '15px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: activeChatUser?.userId === u.userId ? '#e0e7ff' : 'white' }}>
                    <strong>{u.userEmail}</strong>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '10px', display: 'flex', flexDirection: 'column', height: isMobile ? '50vh' : '100%' }}>
                {activeChatUser ? (
                  <>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{activeChatUser.userEmail}</div>
                    <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {supportChats.filter(c => c.userId === activeChatUser.userId).reverse().map(c => (
                        <div key={c.id} style={{ alignSelf: c.sender === 'admin' ? 'flex-end' : 'flex-start', backgroundColor: c.sender === 'admin' ? '#1a237e' : '#f5f5f5', color: c.sender === 'admin' ? 'white' : 'black', padding: '10px', borderRadius: '10px', maxWidth: '80%' }}>
                          {c.text}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleReplyChat} style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                      <input type="text" value={replyMessage} onChange={e => setReplyMessage(e.target.value)} placeholder="Reply..." style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc' }} />
                      <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '20px' }}>Send</button>
                    </form>
                  </>
                ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', padding: '20px' }}>Select a user to view chat</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournament' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', maxWidth: '600px' }}>
            <h1>Tournament Manager</h1>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Prize Pool (Coins)</label>
              <input type="number" value={tournament.prizePool} onChange={e => setTournament({...tournament, prizePool: Number(e.target.value)})} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>End Date</label>
              <input type="date" value={tournament.endDate} onChange={e => setTournament({...tournament, endDate: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
            </div>
            <button onClick={() => setTournament({...tournament, active: !tournament.active})} style={{ width: '100%', padding: '15px', backgroundColor: tournament.active ? '#ef4444' : '#4caf50', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', marginBottom: '20px' }}>
              {tournament.active ? 'STOP TOURNAMENT' : 'START TOURNAMENT'}
            </button>
            <button onClick={handleUpdateTournament} style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Save Changes</button>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <h1>Transactions</h1>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
                <h3 style={{ color: '#4caf50' }}>Pending Deposits ({pendingDeposits.length})</h3>
                {pendingDeposits.map(tx => (
                  <div key={tx.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{tx.userEmail}</p>
                    <p style={{ margin: 0, fontSize: '12px' }}>{tx.amount} Birr ({tx.coins} Coins)</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={() => handleApproveTx(tx)} style={{ padding: '5px 10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px' }}>Approve</button>
                      <button onClick={() => { updateDoc(doc(db, "transactions", tx.id), { status: 'rejected' }); fetchAllData(); }} style={{ padding: '5px 10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
                <h3 style={{ color: '#d32f2f' }}>Pending Withdrawals ({pendingWithdrawals.length})</h3>
                {pendingWithdrawals.map(wd => (
                  <div key={wd.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{wd.userEmail}</p>
                    <p style={{ margin: 0, fontSize: '12px' }}>{wd.etbAmount} Birr (Fee: {wd.feeCoins} Coins)</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={() => { updateDoc(doc(db, "withdrawals", wd.id), { status: 'paid' }); fetchAllData(); }} style={{ padding: '5px 10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px' }}>Mark Paid</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', maxWidth: '600px' }}>
            <h1>Platform Settings</h1>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Coin Rate (1 Birr = ? Coins)</label>
              <input type="number" value={settings.coinRate} onChange={e => setSettings({...settings, coinRate: Number(e.target.value)})} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Withdrawal Fee (%)</label>
              <input type="number" value={settings.withdrawalFeePercentage} onChange={e => setSettings({...settings, withdrawalFeePercentage: Number(e.target.value)})} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontWeight: 'bold' }}>Deposit Bonus Active</span>
              <button onClick={() => setSettings({...settings, depositBonusEnabled: !settings.depositBonusEnabled})} style={{ padding: '5px 15px', backgroundColor: settings.depositBonusEnabled ? '#4caf50' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>{settings.depositBonusEnabled ? 'ON' : 'OFF'}</button>
            </div>
            <button onClick={handleUpdateSettings} style={{ width: '100%', padding: '12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px' }}>Save Settings</button>
          </div>
        )}

        {activeTab === 'games' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
             <h1>Game Odds</h1>
             {['coinflip', 'mines', 'plinko', 'slots', 'wheel', 'dice', 'lucky'].map(game => (
                <div key={game} style={{ marginBottom: '15px' }}>
                  <label style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{game} ({gameOdds[game]}% Win Chance)</label>
                  <input type="range" min="0" max="100" value={gameOdds[game]} onChange={e => setGameOdds({...gameOdds, [game]: Number(e.target.value)})} style={{ width: '100%' }} />
                </div>
             ))}
             <button onClick={handleUpdateGameOdds} style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px' }}>Save Odds</button>
          </div>
        )}

      </div>

      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '300px' }}>
            <h3>Edit @{selectedUser.username}</h3>
            <input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px' }} />
            <button onClick={handleEditBalance} style={{ width: '100%', padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '10px' }}>Save</button>
            <button onClick={() => setSelectedUser(null)} style={{ width: '100%', padding: '10px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
