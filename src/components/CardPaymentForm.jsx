import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function CardPaymentForm() {
  const navigate = useNavigate();
  const [payMethod, setPayMethod] = useState('local');
  const [selectedBank, setSelectedBank] = useState('');
  const [banks, setBanks] = useState([]);
  const [amount, setAmount] = useState(5);
  const [coins, setCoins] = useState(50);
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, "settings", "config"));
      if (settingsDoc.exists()) {
        setBanks(settingsDoc.data().banks || []);
        if (settingsDoc.data().banks?.length > 0) setSelectedBank(settingsDoc.data().banks[0].id);
      } else {
        setBanks([{ id: 'telebirr', name: 'TeleBirr', account: '0964346066' }]);
        setSelectedBank('telebirr');
      }
      if (localStorage.getItem('buyAmount')) setAmount(Number(localStorage.getItem('buyAmount')));
      if (localStorage.getItem('buyCoins')) setCoins(Number(localStorage.getItem('buyCoins')));
    };
    fetchSettings();
  }, []);

  const activeBank = banks.find(b => b.id === selectedBank) || banks[0];

  const copyToClipboard = () => {
    if (activeBank) {
      navigator.clipboard.writeText(activeBank.account);
      toast.success("Account number copied!");
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedBase64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (payMethod === 'local' && !receiptFile) {
      toast.error("Please upload a receipt image.");
      return;
    }

    setLoading(true);
    try {
      let receiptBase64 = "";
      if (receiptFile) {
        receiptBase64 = await compressImage(receiptFile);
      }

      // 1. Save the transaction
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        amount: amount,
        coins: coins,
        method: payMethod === 'card' ? 'Card' : activeBank?.name,
        status: 'pending',
        receiptUrl: receiptBase64,
        createdAt: new Date().toISOString()
      });

      // 2. Notify all Admins about the new pending deposit
      const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnap = await getDocs(adminQuery);
      const adminNotifs = [];
      adminSnap.forEach((adminDoc) => {
        adminNotifs.push(
          addDoc(collection(db, "notifications"), {
            userId: adminDoc.id,
            message: `💰 New pending deposit of ${coins} Coins from ${auth.currentUser.email}`,
            type: 'admin_alert',
            read: false,
            createdAt: new Date().toISOString()
          })
        );
      });
      await Promise.all(adminNotifs);
      
      toast.success("Payment submitted! Waiting for Admin approval.");
      navigate('/success');
    } catch (error) {
      console.error(error);
      toast.error("Payment failed. Image might be too large.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', paddingBottom: '40px' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <h2 style={{ textAlign: 'center' }}>Checkout</h2>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', color: '#000' }}>
        <p style={{ margin: 0, color: '#666' }}>Total to pay</p>
        <h3 style={{ margin: '5px 0', fontSize: '24px' }}>{amount} Birr</h3>
        <p style={{ margin: 0, color: '#f57c00', fontWeight: 'bold' }}>🪙 {coins} Coins</p>
      </div>

      <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Select Payment Method</label>
          <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}>
            {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
          </select>
        </div>

        {activeBank && (
          <div style={{ padding: '15px', border: '1px solid #1a237e', borderRadius: '8px', backgroundColor: '#e8eaf6', color: '#000', position: 'relative' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a237e', fontSize: '16px' }}>{activeBank.name}</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Send to: <strong style={{ fontSize: '16px', letterSpacing: '1px' }}>{activeBank.account}</strong></p>
            <button type="button" onClick={copyToClipboard} style={{ padding: '8px 12px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              📋 Copy Account Number
            </button>
          </div>
        )}

        <div style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Upload Receipt</label>
          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} required={payMethod === 'local'} style={{ display: 'block', margin: '0 auto' }} />
        </div>
        
        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Compressing & Uploading...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}
