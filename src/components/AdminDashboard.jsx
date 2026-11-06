import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); 
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState({
    coinRate: 10, banks: [], maintenance: false, depositBonusEnabled: false,
    gameOdds: { coinflip: 40, dice: 40, wheel: 40, slots: 40 }
  });
  const [announcement, setAnnouncement] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForAnalytics, setSelectedUserForAnalytics] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) {
        setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
      }
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const txSnap = await getDocs(collection(db, "transactions"));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      const wdSnap = await getDocs(collection(db, "withdrawals"));
      setWithdrawals(wdSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      toast.error("Error loading admin data.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- ACTIONS ---

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "config"), settings, { merge: true });
      toast.success("Settings saved successfully!");
    } catch (e) { toast.error("Error saving settings."); }
  };

  const handleToggleBan = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.id), { isBanned: !user.isBanned });
      toast.success(user.isBanned ? "User Unbanned" : "User Banned");
      fetchAllData();
    } catch (e) { toast.error("Error updating user."); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${user.email}?`)) return;
    try {
      await deleteDoc(doc(db, "users", user.id));
      toast.success("User deleted permanently.");
      fetchAllData();
    } catch (e) { toast.error("Error deleting user."); }
  };

  const handleApproveTx = async (tx) => {
    try {
      const userRef = doc(db, "users", tx.userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        let coinsToAdd = tx.coins;
        
        if (settings.depositBonusEnabled && userData.hasDepositedBefore === false) {
           coinsToAdd = Math.floor(tx.coins * 1.5);
           await updateDoc(userRef, { hasDepositedBefore: true });
        }

        await updateDoc(userRef, { coins: (userData.coins || 0) + coinsToAdd });
        await updateDoc(doc(db, "transactions", tx.id), { status: 'completed' });
        
        await addDoc(collection(db, "notifications"), {
          userId: tx.userId, message: `✅ Deposit of ${coinsToAdd} Coins approved.`,
          type: 'deposit', read: false, createdAt: new Date().toISOString()
        });

        toast.success(`Approved! Added ${coinsToAdd} coins.`);
        fetchAllData();
      }
    } catch (e) { toast.error("Error approving transaction."); }
  };

  const handleSendAnnouncement = async () => {
    if (!announcement) return toast.error("Enter a message first.");
    try {
      const notifPromises = [];
      users.forEach((u) => {
        notifPromises.push(addDoc(collection(db, "notifications"), {
          userId: u.id, message: `📢 ADMIN: ${announcement}`,
          type: 'global', read: false, createdAt: new Date().toISOString()
        }));
      });
      await Promise.all(notifPromises);
      toast.success("Announcement sent to all users!");
      setAnnouncement('');
    } catch (e) { toast.error("Error sending announcement."); }
  };

  const handleDrawLottery = async () => {
    if (!window.confirm("Draw a random winner from all users? (Simulated)")) return;
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const prize = 1000; 
    
    try {
      await updateDoc(doc(db, "users", randomUser.id), { coins: (randomUser.coins || 0) + prize });
      toast.success(`Lottery Winner: @${randomUser.username} won ${prize} Coins!`);
      fetchAllData();
    } catch (e) { toast.error("Error drawing lottery."); }
  };

  // --- FILTERING ---
  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pendingDeposits = transactions.filter(tx => tx.status === 'pending' && tx.amount > 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  
  const revenueData = transactions.filter(t => t.status === 'completed' && t.amount > 0).slice(0, 10).reverse().map((tx, i) => ({ name: `Tx ${i+1}`, revenue: tx.amount }));
  const userTx = selectedUserForAnalytics ? transactions.filter(t => t.userId === selectedUserForAnalytics.id) : [];
  const userTotalDeposits = userTx.filter(t => t.amount > 0 && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const userTotalWithdrawals = withdrawals.filter(w => w.userId === selectedUserForAnalytics?.id && w.status === 'paid').reduce((sum, w) => sum + w.etbAmount, 0);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Admin Data...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7f6', color: '#333', fontFamily: 'Arial, sans-serif' }}>
      
      {/* ADMIN SIDEBAR */}
      <div style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#f59e0b' }}>👑 Admin Panel</h2>
        </div>
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {['overview', 'users', 'transactions', 'settings'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ width: '100%', padding: '15px 20px', background: 'none', border: 'none', color: activeTab === tab ? '#f59e0b' : '#cbd5e1', textAlign: 'left', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderLeft: activeTab === tab ? '4px solid #f59e0b' : '4px solid transparent' }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Exit Admin</button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>Overview Dashboard</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #4caf50' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Pending Deposits</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '28px' }}>{pendingDeposits.length}</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #d32f2f' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Pending Withdrawals</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '28px' }}>{pendingWithdrawals.length}</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #1a237e' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total Users</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '28px' }}>{users.length}</h2>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Global Announcement</p>
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  <input type="text" value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="Message..." style={{ flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
                  <button onClick={handleSendAnnouncement} style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>Revenue Analytics</h3>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <XAxis dataKey="name" /><YAxis /><Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#1a237e" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                 <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
                 <button onClick={handleDrawLottery} style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>🏆 Draw Lottery Winner</button>
                 <button onClick={() => setActiveTab('settings')} style={{ width: '100%', padding: '12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Platform Settings</button>
              </div>
            </div>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div>
            <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>User Management</h1>
            <input type="text" placeholder="Search by email or username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px' }} />
            
            <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '15px' }}>Username</th>
                    <th style={{ padding: '15px' }}>Email</th>
                    <th style={{ padding: '15px' }}>Coins</th>
                    <th style={{ padding: '15px' }}>Status</th>
                    <th style={{ padding: '15px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px' }}>@{u.username || 'N/A'}</td>
                      <td style={{ padding: '15px' }}>{u.email}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>🪙 {u.coins || 0}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: u.isBanned ? '#fee2e2' : '#dcfce7', color: u.isBanned ? '#991b1b' : '#166534', fontWeight: 'bold' }}>
                          {u.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                        <button onClick={() => setSelectedUserForAnalytics(u)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Analytics</button>
                        <button onClick={() => handleToggleBan(u)} style={{ padding: '6px 12px', backgroundColor: u.isBanned ? '#4caf50' : '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{u.isBanned ? 'Unban' : 'Ban'}</button>
                        <button onClick={() => handleDeleteUser(u)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TRANSACTIONS TAB --- */}
        {activeTab === 'transactions' && (
          <div>
            <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>Transactions & Approvals</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#4caf50' }}>Pending Deposits ({pendingDeposits.length})</h3>
                {pendingDeposits.map(tx => (
                  <div key={tx.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{tx.userEmail}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{tx.amount} Birr ({tx.coins} Coins)</p>
                      {tx.receiptUrl && <button onClick={() => { const w = window.open(); w.document.write(`<img src="${tx.receiptUrl}" style="max-width:100%" />`); }} style={{ padding: '4px 8px', marginTop: '5px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>View Receipt</button>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleApproveTx(tx)} style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Approve</button>
                      <button onClick={() => { updateDoc(doc(db, "transactions", tx.id), { status: 'rejected' }); fetchAllData(); }} style={{ padding: '8px 15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reject</button>
                    </div>
                  </div>
                ))}
                {pendingDeposits.length === 0 && <p style={{ color: '#666' }}>No pending deposits.</p>}
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Pending Withdrawals ({pendingWithdrawals.length})</h3>
                {pendingWithdrawals.map(wd => (
                  <div key={wd.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{wd.userEmail}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{wd.coinsDeducted} Coins ({wd.etbAmount} Birr)</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{wd.bankName} - {wd.accountNo}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { updateDoc(doc(db, "withdrawals", wd.id), { status: 'paid' }); fetchAllData(); }} style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mark Paid</button>
                      <button onClick={() => { updateDoc(doc(db, "withdrawals", wd.id), { status: 'rejected' }); fetchAllData(); }} style={{ padding: '8px 15px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reject</button>
                    </div>
                  </div>
                ))}
                {pendingWithdrawals.length === 0 && <p style={{ color: '#666' }}>No pending withdrawals.</p>}
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div>
            <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>Platform Settings</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>Global Config</h3>
                
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Coin Rate (1 Birr = ? Coins)</label>
                <input type="number" value={settings.coinRate} onChange={e => setSettings({...settings, coinRate: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '15px' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>First Deposit Bonus</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Give 50% extra on first deposit</p>
                  </div>
                  <button onClick={() => setSettings({...settings, depositBonusEnabled: !settings.depositBonusEnabled})} style={{ padding: '8px 15px', backgroundColor: settings.depositBonusEnabled ? '#4caf50' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{settings.depositBonusEnabled ? 'ON' : 'OFF'}</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Maintenance Mode</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Lock the app for all users</p>
                  </div>
                  <button onClick={() => setSettings({...settings, maintenance: !settings.maintenance})} style={{ padding: '8px 15px', backgroundColor: settings.maintenance ? '#4caf50' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{settings.maintenance ? 'ON' : 'OFF'}</button>
                </div>

                <button onClick={handleUpdateSettings} style={{ width: '100%', padding: '12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save All Settings</button>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>Game Odds Controller</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Adjust the player win chance for each game. The rest goes to the House.</p>
                
                {['coinflip', 'dice', 'wheel', 'slots'].map(game => (
                  <div key={game} style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <label style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{game}</label>
                      <span style={{ fontWeight: 'bold', color: '#1a237e' }}>{settings.gameOdds?.[game] || 40}% Win Chance</span>
                    </div>
                    <input 
                      type="range" min="10" max="90" 
                      value={settings.gameOdds?.[game] || 40} 
                      onChange={e => setSettings({...settings, gameOdds: { ...settings.gameOdds, [game]: Number(e.target.value) }})} 
                      style={{ width: '100%', cursor: 'pointer' }} 
                    />
                  </div>
                ))}
                <button onClick={handleUpdateSettings} style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Update Game Odds</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* USER ANALYTICS MODAL */}
      {selectedUserForAnalytics && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 20px 0' }}>User Analytics: @{selectedUserForAnalytics.username}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#666' }}>Email</span>
              <strong>{selectedUserForAnalytics.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#666' }}>Current Balance</span>
              <strong style={{ color: '#f59e0b' }}>🪙 {selectedUserForAnalytics.coins}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#666' }}>Total Deposited (ETB)</span>
              <strong style={{ color: '#4caf50' }}>{userTotalDeposits} Birr</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              <span style={{ color: '#666' }}>Total Withdrawn (ETB)</span>
              <strong style={{ color: '#d32f2f' }}>{userTotalWithdrawals} Birr</strong>
            </div>
            <button onClick={() => setSelectedUserForAnalytics(null)} style={{ width: '100%', padding: '12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
