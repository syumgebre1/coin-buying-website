import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, ThemeContext } from './ThemeContext';

import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import GetCoinsPage from './components/GetCoinsPage';
import CustomAmountPage from './components/CustomAmountPage';
import CardPaymentForm from './components/CardPaymentForm';
import OrderConfirmation from './components/OrderConfirmation';
import TransactionHistory from './components/TransactionHistory';
import InviteRewards from './components/InviteRewards';
import AdminDashboard from './components/AdminDashboard';
import CasinoHub from './components/CasinoHub';
import UserProfile from './components/UserProfile';
import Leaderboard from './components/Leaderboard';
import Withdraw from './components/Withdraw';
import VerifyEmail from './components/VerifyEmail';
import ForcePasswordChange from './components/ForcePasswordChange'; // Import new modal
import './App.css';

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ user, isAdmin, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  useEffect(() => {
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsAdmin(data.role === 'admin');
            // Check if they need to change password
            if (data.hasChangedPassword === false) {
              setNeedsPasswordChange(true);
            } else {
              setNeedsPasswordChange(false);
            }
          }
        });
      } else {
        setIsAdmin(false);
        setNeedsPasswordChange(false);
      }
      setLoading(false);
    });
    return () => { unsubscribeAuth(); if (unsubDoc) unsubDoc(); };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  const navBg = darkMode ? '#1e1e1e' : 'white';
  const navBorder = darkMode ? '#333' : '#eee';
  const textColor = darkMode ? '#fff' : '#1a237e';

  if (user && !user.emailVerified && window.location.pathname !== '/') {
    return <VerifyEmail user={user} refreshUser={(u) => setUser({ ...u })} />;
  }

  return (
    <div className="app-container" style={{ textAlign: 'center', padding: '20px', paddingBottom: '100px', color: darkMode ? '#fff' : '#000' }}>
      
      {/* Show Password Change Modal if needed */}
      {needsPasswordChange && <ForcePasswordChange onClose={() => setNeedsPasswordChange(false)} />}

      <main className="content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<ProtectedRoute user={user}><GetCoinsPage /></ProtectedRoute>} />
          <Route path="/custom" element={<ProtectedRoute user={user}><CustomAmountPage /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute user={user}><CardPaymentForm /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute user={user}><OrderConfirmation /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute user={user}><TransactionHistory /></ProtectedRoute>} />
          <Route path="/invite" element={<ProtectedRoute user={user}><InviteRewards /></ProtectedRoute>} />
          <Route path="/casino" element={<ProtectedRoute user={user}><CasinoHub /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user}><UserProfile /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute user={user}><Leaderboard /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute user={user}><Withdraw /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute user={user} isAdmin={isAdmin}><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>

      {user && user.emailVerified && window.location.pathname !== '/' && (
        <nav style={{ position: 'fixed', bottom: '40px', left: 0, right: 0, backgroundColor: navBg, borderTop: `1px solid ${navBorder}`, display: 'flex', justifyContent: 'space-around', padding: '15px 5px', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', overflowX: 'auto', zIndex: 100 }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px' }}>Home</Link>
          <Link to="/casino" style={{ textDecoration: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px' }}>Casino</Link>
          <Link to="/leaderboard" style={{ textDecoration: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px' }}>Leaders</Link>
          <Link to="/history" style={{ textDecoration: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px' }}>History</Link>
          <Link to="/profile" style={{ textDecoration: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px' }}>Profile</Link>
          {isAdmin && <Link to="/admin" style={{ textDecoration: 'none', color: '#d32f2f', fontWeight: 'bold', fontSize: '12px' }}>Admin</Link>}
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: 'none', color: textColor, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => signOut(auth)} style={{ background: 'none', border: 'none', color: '#666', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Out</button>
        </nav>
      )}

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: darkMode ? '#121212' : '#f1f1f1', borderTop: `1px solid ${navBorder}`, padding: '10px', textAlign: 'center', fontSize: '12px', zIndex: 101, color: darkMode ? '#aaa' : '#555' }}>
        Built with ❤️ by <a href="https://syum-portfolio.netlify.app" target="_blank" rel="noreferrer" style={{ color: '#1a237e', fontWeight: 'bold', textDecoration: 'none' }}>SYUM TEAME</a>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}
