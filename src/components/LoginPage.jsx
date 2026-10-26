import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // For sign up
  const [email, setEmail] = useState(''); // For sign up
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        let loginEmail = identifier;

        // If the identifier does not include '@', it's a username. Look up the email.
        if (!identifier.includes('@')) {
          const q = query(collection(db, "users"), where("username", "==", identifier.toLowerCase()));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            return toast.error("Username not found.");
          }
          loginEmail = snap.docs[0].data().email;
        }

        const userCred = await signInWithEmailAndPassword(auth, loginEmail, password);
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        
        if (userDoc.exists() && userDoc.data().isBanned) {
          await auth.signOut();
          toast.error("Your account has been banned.");
          return;
        }

        if (!userCred.user.emailVerified) {
           toast.error("Please verify your email first.");
        } else {
           toast.success(`Welcome back!`);
        }
      } else {
        // SIGN UP LOGIC
        if (!username.trim()) return toast.error("Please enter a username.");
        if (!email.includes('@')) return toast.error("Please enter a valid email.");
        
        // Check if username is already taken
        const userQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) return toast.error("Username is already taken.");

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

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);

        const myInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: email,
          username: username.toLowerCase(),
          role: "user",
          coins: 0,
          isBanned: false,
          inviteCode: myInviteCode,
          referredBy: referrerId || null,
          hasChangedPassword: true,
          createdAt: new Date().toISOString()
        });

        if (referrerId) {
          const referrerRef = doc(db, "users", referrerId);
          const referrerSnap = await getDoc(referrerRef);
          if (referrerSnap.exists()) {
            const currentCoins = referrerSnap.data().coins || 0;
            await updateDoc(referrerRef, { coins: currentCoins + 50 });
          }
        }

        toast.success(`Account created! Check ${email} to verify.`);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", ""));
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.includes('@')) {
      return toast.error("Please enter your full email address to reset password.");
    }
    try {
      await sendPasswordResetEmail(auth, identifier);
      toast.success("Password reset link sent! Check your email.");
    } catch (error) {
      toast.error("Error sending reset email.");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '20px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', color: '#000' }}>
      <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left', marginTop: '20px' }}>
        
        {!isLogin ? (
          <>
            <div>
              <label style={{ fontWeight: 'bold' }}>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="e.g. syum_teame" style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontWeight: 'bold' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
          </>
        ) : (
          <div>
            <label style={{ fontWeight: 'bold' }}>Email or Username</label>
            <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="Enter email or username" style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
        )}
        
        <div>
          <label style={{ fontWeight: 'bold' }}>Password</label>
          <div style={{ position: 'relative', marginTop: '5px' }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        
        {isLogin && (
          <div style={{ textAlign: 'right' }}>
            <span onClick={handleForgotPassword} style={{ color: '#d32f2f', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Forgot Password?</span>
          </div>
        )}

        {!isLogin && (
          <div>
            <label style={{ fontWeight: 'bold' }}>Referral Code (Optional)</label>
            <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Enter friend's code" style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
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
