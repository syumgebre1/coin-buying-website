import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import toast from 'react-hot-toast';

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
import ForcePasswordChange from './components/ForcePasswordChange';
import Missions from './components/Missions';
import Lottery from './components/Lottery';
import Friends from './components/Friends';
import LiveChat from './components/LiveChat'; // Import LiveChat
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
  const [isMaintenance, setIsMaintenance] = useState(false); // New Maintenance State
  const [lastAnnouncement, setLastAnnouncement] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    let unsubDoc = null;
    let unsubSettings = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsAdmin(data.role === 'admin');
            setNeedsPasswordChange(data.hasChangedPassword === false);
          }
        });
      } else {
        setIsAdmin(false);
        setNeedsPasswordChange(false);
      }
      setLoading(false);
    });

    // Listen for Maintenance Mode changes
    unsubSettings = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenance(docSnap.data().maintenance || false);
      }
    });

    return () => { unsubscribeAuth(); if (unsubDoc) unsubDoc(); if (unsubSettings) unsubSettings(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        if (latest.message !== lastAnnouncement) {
          toast.success(latest.message, { duration: 6000, icon: '📢' });
          setLastAnnouncement(latest.message);
        }
      }
    });
    return () => unsubscribe();
  }, [user, lastAnnouncement]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  // MAINTENANCE MODE BLOCK
  if (isMaintenance && !isAdmin && location.pathname !== '/') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', backgroundColor: darkMode ? '#121212' : '#f5f5f5', color: darkMode ? 'white' : 'black' }}>
        <h1 style={{ fontSize: '48px', margin: 0 }}>🔧</h1>
        <h2>Under Maintenance</h2>
        <p>We are currently upgrading our systems. Please check back soon!</p>
        <button onClick={() => signOut(auth)} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
      </div>
    );
  }

  const navBg = darkMode ? '#1e1e1e' : 'white';
  const navBorder = darkMode ? '#333' : '#eee';
  const textColor = darkMode ? '#fff' : '#1a237e';
  const showNav = user && user.emailVerified && location.pathname !== '/';

  const sidebarStyle = isMobile ? {
    width: '250px', backgroundColor: navBg, borderRight: `1px solid ${navBorder}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 1000, overflowY: 'auto', transition: 'transform 0.3s ease',
    transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', boxShadow: isMobileMenuOpen ? '2px 0 10px rgba(0,0,0,0.5)' : 'none'
  } : { width: '250px', backgroundColor: navBg, borderRight: `1px solid ${navBorder}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 1000, overflowY: 'auto' };

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', color: darkMode ? '#fff' : '#000' }}>
      
      {showNav && isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', backgroundColor: navBg, borderBottom: `1px solid ${navBorder}`, zIndex: 900, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: '#1a237e', fontSize: '20px' }}>🪙 Coin App</h2>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: textColor }}>☰</button>
        </div>
      )}

      {isMobile && isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}></div>
      )}

      {showNav && (
        <aside style={sidebarStyle}>
          <div style={{ padding: '20px', borderBottom: `1px solid ${navBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#1a237e' }}>🪙 Coin App</h2>
            {isMobile && <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: textColor }}>✕</button>}
          </div>

          <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/dashboard" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/dashboard' ? 'white' : textColor, backgroundColor: location.pathname === '/dashboard' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>🏠 Home</Link>
            <Link to="/casino" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/casino' ? 'white' : textColor, backgroundColor: location.pathname === '/casino' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>🎰 Casino</Link>
            <Link to="/livechat" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/livechat' ? 'white' : textColor, backgroundColor: location.pathname === '/livechat' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>💬 Lobby</Link> {/* New Link */}
            <Link to="/friends" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/friends' ? 'white' : textColor, backgroundColor: location.pathname === '/friends' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>👥 Friends</Link>
            <Link to="/missions" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/missions' ? 'white' : textColor, backgroundColor: location.pathname === '/missions' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>🎯 Missions</Link>
            <Link to="/lottery" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/lottery' ? 'white' : textColor, backgroundColor: location.pathname === '/lottery' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>🎟️ Lottery</Link>
            <Link to="/leaderboard" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/leaderboard' ? 'white' : textColor, backgroundColor: location.pathname === '/leaderboard' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>🏆 Leaders</Link>
            <Link to="/history" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/history' ? 'white' : textColor, backgroundColor: location.pathname === '/history' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>📜 History</Link>
            <Link to="/profile" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/profile' ? 'white' : textColor, backgroundColor: location.pathname === '/profile' ? '#1a237e' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>👤 Profile</Link>
            
            {isAdmin && (
              <Link to="/admin" style={{ padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/admin' ? 'white' : '#d32f2f', backgroundColor: location.pathname === '/admin' ? '#d32f2f' : 'transparent', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', borderTop: `1px solid ${navBorder}`, paddingTop: '20px' }}>🛡️ Admin</Link>
            )}
          </nav>

          <div style={{ padding: '20px', borderTop: `1px solid ${navBorder}` }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: 'transparent', color: textColor, border: `1px solid ${navBorder}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <button onClick={() => signOut(auth)} style={{ width: '100%', padding: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, marginLeft: (showNav && !isMobile) ? '250px' : '0', display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: (showNav && isMobile) ? '70px' : '0', paddingBottom: '40px' }}>
        {needsPasswordChange && <ForcePasswordChange onClose={() => setNeedsPasswordChange(false)} />}
        <main style={{ flex: 1, padding: '20px' }}>
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
            <Route path="/livechat" element={<ProtectedRoute user={user}><LiveChat /></ProtectedRoute>} /> {/* New Route */}
            <Route path="/friends" element={<ProtectedRoute user={user}><Friends /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><UserProfile /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute user={user}><Leaderboard /></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute user={user}><Withdraw /></ProtectedRoute>} />
            <Route path="/missions" element={<ProtectedRoute user={user}><Missions /></ProtectedRoute>} />
            <Route path="/lottery" element={<ProtectedRoute user={user}><Lottery /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute user={user} isAdmin={isAdmin}><AdminDashboard /></AdminRoute>} />
            <Route path="/verify" element={<VerifyEmail user={user} refreshUser={(u) => setUser({ ...u })} />} />
          </Routes>
        </main>
        <footer style={{ backgroundColor: darkMode ? '#121212' : '#f1f1f1', borderTop: `1px solid ${navBorder}`, padding: '10px', textAlign: 'center', fontSize: '12px', color: darkMode ? '#aaa' : '#555' }}>
          Built with ❤️ by <a href="https://syum-portfolio.netlify.app" target="_blank" rel="noreferrer" style={{ color: '#1a237e', fontWeight: 'bold', textDecoration: 'none' }}>SYUM TEAME</a>
        </footer>
      </div>
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
