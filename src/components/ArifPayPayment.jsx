import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function ArifPayPayment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    if (localStorage.getItem('buyAmount')) setAmount(Number(localStorage.getItem('buyAmount')));
    if (localStorage.getItem('buyCoins')) setCoins(Number(localStorage.getItem('buyCoins')));
  }, []);

  const handleArifPayPayment = async () => {
    if (amount <= 0) return toast.error("Invalid amount.");
    setLoading(true);

    try {
      const tx_ref = `coin-app-${Date.now()}`;
      
      // NOTE: Replace this with your actual key. 
      // For security, in a real app, this should be in a .env file.
      const apiKey = "sk_test_arifpay_1234567890abcdef1234567890"; 

      const payload = {
        cancelUrl: window.location.origin + "/dashboard",
        errorUrl: window.location.origin + "/dashboard",
        notifyUrl: window.location.origin + "/dashboard", 
        successUrl: window.location.origin + "/success",
        phone: "251900000000", // Sandbox test phone number
        email: auth.currentUser.email,
        nonce: tx_ref,
        items: [
          {
            name: `${coins} Coins`,
            quantity: 1,
            price: amount,
            description: "SYUM BET Top-up"
          }
        ],
        beneficiaries: [
          {
            accountNumber: "01320811436100", // Sandbox test account
            bank: "AWINETAA", 
            amount: amount
          }
        ]
      };

      // Use ArifPay Sandbox URL
      const response = await fetch("https://gateway.arifpay.net/api/sandbox/checkout/session", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("ArifPay Response:", data);

      if (data.message === "Success" || data.status === "success") {
        await addDoc(collection(db, "transactions"), {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          amount: amount,
          coins: coins,
          method: "ArifPay Gateway",
          status: "pending",
          tx_ref: tx_ref,
          createdAt: new Date().toISOString()
        });

        const checkoutUrl = data.data?.paymentUrl || data.data?.checkoutUrl;
        if (checkoutUrl) {
           window.location.href = checkoutUrl;
        } else {
           toast.error("Could not get checkout URL from ArifPay.");
        }
      } else {
        toast.error(data.message || "Payment initialization failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error. Please check console.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center' }}>
      <h2>Pay with ArifPay</h2>
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '20px', color: '#000' }}>
        <p style={{ margin: 0 }}>Amount to pay:</p>
        <h1 style={{ margin: '10px 0', fontSize: '32px' }}>{amount} Birr</h1>
        <p style={{ color: '#f57c00', fontWeight: 'bold' }}>🪙 {coins} Coins</p>
      </div>

      <button 
        onClick={handleArifPayPayment} 
        disabled={loading}
        style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'Connecting to ArifPay...' : 'Pay Now (Secure)'}
      </button>
    </div>
  );
}
