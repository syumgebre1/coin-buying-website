import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchHistory = async () => {
      const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const txs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(txs);
    };
    fetchHistory();
  }, []);

  const filteredTxs = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'purchases') return tx.amount > 0 && !tx.method.includes('Withdraw');
    if (filter === 'withdrawals') return tx.method.includes('Withdraw');
    if (filter === 'wins') return tx.status === 'won';
    if (filter === 'losses') return tx.status === 'lost';
    return true;
  });

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#eee';
  const textColor = darkMode ? '#fff' : '#000';

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginRight: '15px', color: textColor }}>←</button>
        <h2 style={{ margin: 0, color: textColor }}>History</h2>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {['all', 'purchases', 'withdrawals', 'wins', 'losses'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize', backgroundColor: filter === f ? '#1a237e' : (darkMode ? '#333' : '#e0e0e0'), color: filter === f ? 'white' : textColor, fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredTxs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>No {filter} found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTxs.map((tx) => {
            const isWithdrawal = tx.method.includes('Withdraw');
            
            return (
              <div key={tx.id} style={{ padding: '15px', border: `1px solid ${cardBorder}`, borderRadius: '8px', backgroundColor: cardBg, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <strong style={{ color: isWithdrawal ? '#d32f2f' : (darkMode ? '#90caf9' : '#1a237e'), textTransform: 'capitalize' }}>{tx.method}</strong>
                  <span style={{ fontWeight: 'bold', color: textColor }}>
                    {isWithdrawal ? `${tx.amount} Birr` : (tx.amount > 0 ? `${tx.amount} Birr` : `${tx.coins} Coins`)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666', alignItems: 'center' }}>
                  <span>{new Date(tx.createdAt).toLocaleString()}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: isWithdrawal ? '#d32f2f' : '#f57c00', fontWeight: 'bold' }}>
                      🪙 {isWithdrawal ? `-${tx.coins}` : tx.coins} Coins
                    </span>
                    <br />
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: tx.status === 'completed' || tx.status === 'won' ? '#e8f5e9' : tx.status === 'rejected' || tx.status === 'lost' ? '#ffebee' : '#fff3e0', color: tx.status === 'completed' || tx.status === 'won' ? '#2e7d32' : tx.status === 'rejected' || tx.status === 'lost' ? '#c62828' : '#ef6c00' }}>
                      {tx.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
