import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(''); // New state for referral
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        if (userDoc.exists() && userDoc.data().isBanned) {
          await auth.signOut();
          toast.error("Your account has been banned.");
          return;
        }
        toast.success("Welcome back!");
      } else {
        // Check if referral code is valid
        let referrerId = null;
        if (referralCode) {
          const q = query(collection(db, "users"), where("inviteCode", "==", referralCode.toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            referrerId = snap.docs[0].id;
          } else {
            return toast.error("Invalid referral code.");
          }
        }

        // Create User
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const myInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate their own code
        
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: email,
          role: "user",
          coins: 0,
          isBanned: false,
          inviteCode: myInviteCode,
          referredBy: referrerId || null,
          createdAt: new Date().toISOString()
        });

        // Reward the referrer if valid
        if (referrerId) {
          const referrerRef = doc(db, "users", referrerId);
          const referrerSnap = await getDoc(referrerRef);
          if (referrerSnap.exists()) {
            const currentCoins = referrerSnap.data().coins || 0;
            await updateDoc(referrerRef, { coins: currentCoins + 50 }); // Give 50 coins bonus
          }
        }

        toast.success("Account created! You got a welcome bonus.");
      }
      navigate('/');
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '20px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', color: '#000' }}>
      <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left', marginTop: '20px' }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc' }} />
        </div>
        
        {/* Referral Code Input (Only shows on Sign Up) */}
        {!isLogin && (
          <div>
            <label style={{ fontWeight: 'bold' }}>Referral Code (Optional)</label>
            <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Enter friend's code" style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}

        <button type="submit" style={{ padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#1a237e', fontWeight: 'bold', cursor: 'pointer' }}>
          {isLogin ? 'Sign up' : 'Login'}
        </span>
      </p>
    </div>
  );
}
