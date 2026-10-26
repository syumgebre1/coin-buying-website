import React, { useState } from 'react';
import { auth } from '../firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function VerifyEmail({ user, refreshUser }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const resendEmail = async () => {
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      toast.error("Too many requests. Please wait a few minutes.");
    }
    setLoading(false);
  };

  const checkVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        toast.success("Email verified successfully!");
        refreshUser(auth.currentUser);
      } else {
        toast.error("Email not verified yet. Please check your inbox.");
      }
    } catch (error) {
      toast.error("Error checking verification status.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ maxWidth: '400px', width: '90%', padding: '30px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', color: '#000' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>✉️</div>
        <h2 style={{ margin: '0 0 10px 0' }}>Verify Your Email</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          We sent a verification link to <strong>{user.email}</strong>. Please click the link to activate your account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={checkVerification} disabled={loading} style={{ padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? 'Checking...' : "I've Verified My Email"}
          </button>
          
          <button onClick={resendEmail} disabled={loading} style={{ padding: '15px', backgroundColor: 'transparent', color: '#1a237e', border: '1px solid #1a237e', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            Resend Verification Email
          </button>

          <button onClick={() => signOut(auth).then(() => navigate('/login'))} style={{ marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#d32f2f', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
