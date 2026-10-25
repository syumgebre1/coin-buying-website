import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [coinRate, setCoinRate] = useState(10);
  const [banks, setBanks] = useState([]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // New search state
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]); 
  const [promos, setPromos] = useState([]);
  
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
  };

  useEffect(() => { 
    fetchData(); 
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

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

  // Filter users based on search
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalRevenue = transactions.filter(t => t.status === 'completed' && t.amount > 0 && !t.method.includes('Withdraw')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalCoinsSold = transactions.filter(t => t.status === 'completed' && t.amount > 0 && !t.method.includes('Withdraw')).reduce((sum, t) => sum + (Number(t.coins) || 0), 0);

  const saveSettings = async () => {
    await setDoc(doc(db, "settings", "config"), { coinRate, banks });
    toast.success('Settings saved!');
  };

  const addBank = () => {
    if (newBankName && newBankAccount) {
      setBanks([...banks, { id: Date.now().toString(), name: newBankName, account: newBankAccount }]);
      setNewBankName(''); setNewBankAccount('');
    }
  };

  const createPromo = async () => {
    if (promoCode && promoCoins) {
      await setDoc(doc(db, "promos", promoCode.toUpperCase()), { coins: Number(promoCoins), used: false });
      toast.success(`Promo code ${promoCode.toUpperCase()} created!`);
      setPromoCode('');
      fetchData();
    }
  };

  const approveTx = async (tx) => {
    try {
      const userRef = doc(db, "users", tx.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCoins = userSnap.data().coins || 0;
        await updateDoc(userRef, { coins: currentCoins + tx.coins });
        await updateDoc(doc(db, "transactions", tx.id), { status: 'completed' });
        toast.success(`Approved! Added ${tx.coins} coins.`);
        fetchData();
      } else {
        toast.error("User document not found!");
      }
    } catch (e) { toast.error(e.message); }
  };

  const rejectTx = async (tx) => {
    await updateDoc(doc(db, "transactions", tx.id), { status: 'rejected' });
    toast.error("Transaction rejected.");
    fetchData();
  };

  const processWithdrawal = async (wd, status) => {
    if (status === 'rejected') {
      try {
        const userRef = doc(db, "users", wd.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentCoins = userSnap.data().coins || 0;
          await updateDoc(userRef, { coins: currentCoins + wd.coinsDeducted });
        }
      } catch (e) { console.error(e); }
    }
    
    await updateDoc(doc(db, "withdrawals", wd.id), { status: status });

    try {
      const q = query(collection(db, "transactions"), where("userId", "==", wd.userId), where("status", "==", "pending"), where("coins", "==", wd.coinsDeducted));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const txDoc = snap.docs[0].id;
        await updateDoc(doc(db, "transactions", txDoc), { status: status === 'paid' ? 'completed' : 'rejected' });
      }
    } catch(e) { console.log(e); }

    toast.success(`Withdrawal marked as ${status}.`);
    fetchData();
  };

  const toggleBan = async (user) => {
    await updateDoc(doc(db, "users", user.id), { isBanned: !user.isBanned });
    toast.success(user.isBanned ? "User unbanned" : "User banned");
    fetchData();
  };

  const viewReceipt = (base64Data) => {
    const newTab = window.open();
    newTab.document.write(`<img src="${base64Data}" style="max-width: 100%;" />`);
  };

  const activeChatMessages = chats.filter(c => c.userId === selectedUser?.id);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Admin Dashboard</h2>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Site</button>
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>Global Settings</h3>
          <label style={{ fontWeight: 'bold' }}>Coin Rate (1 Birr = ? Coins)</label>
          <input type="number" value={coinRate} onChange={(e) => setCoinRate(Number(e.target.value))} style={{ width: '100%', padding: '10px', margin: '5px 0 15px', borderRadius: '4px', border: '1px solid #ccc' }} />
          
          <h3>Bank Accounts</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="Bank Name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Acc No." value={newBankAccount} onChange={(e) => setNewBankAccount(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button onClick={addBank} style={{ padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
          </div>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            {banks.map(b => <li key={b.id}>{b.name} - {b.account} <button onClick={() => setBanks(banks.filter(x => x.id !== b.id))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button></li>)}
          </ul>
          <button onClick={saveSettings} style={{ width: '100%', padding: '12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Settings</button>
          
          <hr style={{ margin: '20px 0', borderTop: '1px solid #ddd' }} />
          
          <h3>Create Promo Code</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input type="text" placeholder="Code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="number" placeholder="Coins" value={promoCoins} onChange={(e) => setPromoCoins(e.target.value)} style={{ width: '80px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button onClick={createPromo} style={{ padding: '10px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create</button>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #ccc' }}><th>Code</th><th>Coins</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ fontWeight: 'bold' }}>{p.id}</td>
                    <td>{p.coins}</td>
                    <td>{p.used ? <span style={{color:'red'}}>Used</span> : <span style={{color:'green'}}>Active</span>}</td>
                    <td><button onClick={() => deletePromo(p.id)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Users ({filteredUsers.length})</h3>
            <input type="text" placeholder="Search email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead><tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}><th>Email</th><th>Coins</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{u.email}</td>
                  <td>{u.coins || 0}</td>
                  <td>
                    <button onClick={() => toggleBan(u)} style={{ padding: '5px 10px', backgroundColor: u.isBanned ? '#d32f2f' : '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      {u.isBanned ? 'Banned' : 'Active'}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => editUserBalance(u)} style={{ padding: '5px 10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit Balance</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ border: '2px solid #d32f2f', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#d32f2f' }}>Withdrawal Requests ({withdrawals.filter(w => w.status === 'pending').length} Pending)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead><tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}><th>User</th><th>Coins</th><th>To Pay (ETB)</th><th>Bank Info</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {withdrawals.map(wd => (
              <tr key={wd.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{wd.userEmail}</td>
                <td style={{ color: '#f57c00', fontWeight: 'bold' }}>{wd.coinsDeducted} Coins</td>
                <td style={{ color: '#2e7d32', fontWeight: 'bold' }}>{wd.etbAmount} Birr</td>
                <td><strong>{wd.bankName}</strong><br/><small>{wd.accountNo}</small></td>
                <td>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '12px', backgroundColor: wd.status === 'paid' ? '#e8f5e9' : wd.status === 'rejected' ? '#ffebee' : '#fff3e0', color: wd.status === 'paid' ? '#2e7d32' : wd.status === 'rejected' ? '#c62828' : '#ef6c00' }}>
                    {wd.status}
                  </span>
                </td>
                <td>
                  {wd.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => processWithdrawal(wd, 'paid')} style={{ padding: '5px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Mark Paid</button>
                      <button onClick={() => processWithdrawal(wd, 'rejected')} style={{ padding: '5px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, borderRight: '1px solid #ddd', paddingRight: '20px' }}>
          <h3>Support Tickets ({new Set(chats.map(c => c.userId)).size})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {Array.from(new Set(chats.map(c => c.userId))).map(userId => {
              const user = users.find(u => u.id === userId);
              if (!user) return null;
              return (
                <button key={userId} onClick={() => setSelectedUser(user)} style={{ padding: '10px', textAlign: 'left', backgroundColor: selectedUser?.id === userId ? '#e8eaf6' : 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>
                  {user.email}
                </button>
              );
            })}
            {chats.length === 0 && <p style={{ color: '#999', fontSize: '12px' }}>No messages yet.</p>}
          </div>
        </div>

        <div style={{ flex: 2 }}>
          {selectedUser ? (
            <>
              <h3>Chat with {selectedUser.email}</h3>
              <div style={{ height: '200px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '6px', padding: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#fafafa' }}>
                {activeChatMessages.map(msg => (
                  <div key={msg.id} style={{ alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'admin' ? '#1a237e' : '#e0e0e0', color: msg.sender === 'admin' ? 'white' : 'black', padding: '8px 12px', borderRadius: '12px', maxWidth: '80%', fontSize: '13px' }}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type reply..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <button onClick={sendReply} style={{ padding: '10px 20px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reply</button>
              </div>
            </>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>Select a user to view their chat.</p>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', maxHeight: '500px', overflowY: 'auto' }}>
        <h3>Transactions ({transactions.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead><tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}><th>User</th><th>Method</th><th>Amount</th><th>Receipt</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{tx.userEmail}</td>
                <td>{tx.method}</td>
                <td>
                  {tx.amount === 0 ? (
                    <span style={{ color: '#f57c00', fontWeight: 'bold' }}>{tx.coins} Coins Bet</span>
                  ) : (
                    <span>{tx.amount} Birr <br/><small style={{color:'#666'}}>({tx.coins} Coins)</small></span>
                  )}
                </td>
                <td>
                  {tx.receiptUrl ? (
                    <button onClick={() => viewReceipt(tx.receiptUrl)} style={{ background: 'none', border: 'none', color: '#1a237e', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>View Image</button>
                  ) : (
                    <span style={{ color: '#999' }}>None</span>
                  )}
                </td>
                <td>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '12px', backgroundColor: tx.status === 'completed' ? '#e8f5e9' : tx.status === 'rejected' || tx.status === 'lost' ? '#ffebee' : tx.status === 'won' ? '#e8f5e9' : '#fff3e0', color: tx.status === 'completed' || tx.status === 'won' ? '#2e7d32' : tx.status === 'rejected' || tx.status === 'lost' ? '#c62828' : '#ef6c00' }}>
                    {tx.status}
                  </span>
                </td>
                <td>
                  {tx.status === 'pending' && tx.amount > 0 && !tx.method.includes('Withdraw') && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => approveTx(tx)} style={{ padding: '5px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => rejectTx(tx)} style={{ padding: '5px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
