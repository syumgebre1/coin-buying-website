import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for personal notifications (transfers)
    const qUser = query(
      collection(db, "notifications"), 
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Only set notifications if we have personal ones, otherwise keep global
      setNotifications(prev => {
        const combined = [...prev.filter(n => n.type === 'global'), ...notifs];
        return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
      // Count unread personal notifications
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    // Listen for global announcements
    const qGlobal = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      const globalNotifs = snapshot.docs.map(d => ({ 
        id: d.id, 
        type: 'global', 
        message: d.data().message, 
        createdAt: d.data().createdAt, 
        read: true // Global announcements don't trigger the red dot
      }));
      
      setNotifications(prev => {
        const combined = [...prev.filter(n => n.type !== 'global'), ...globalNotifs];
        return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
    });

    return () => { unsubscribeUser(); unsubscribeGlobal(); };
  }, []);

  const toggleOpen = async () => {
    setIsOpen(!isOpen);
    
    // If opening, mark all personal notifications as read
    if (!isOpen) {
      const unreadIds = notifications.filter(n => !n.read && n.type !== 'global').map(n => n.id);
      for (const id of unreadIds) {
        await updateDoc(doc(db, "notifications", id), { read: true });
      }
      setUnreadCount(0);
    }
  };

  const bg = darkMode ? '#1e1e1e' : 'white';
  const text = darkMode ? '#fff' : '#000';
  const border = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Bell Icon with fixed size */}
      <button 
        onClick={toggleOpen} 
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          position: 'relative', 
          padding: '8px', 
          fontSize: '24px', // Fixed font size
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', 
            top: '2px', 
            right: '2px', 
            backgroundColor: '#d32f2f', 
            color: 'white', 
            fontSize: '10px', 
            fontWeight: 'bold', 
            padding: '2px 5px', 
            borderRadius: '50%',
            minWidth: '16px',
            textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{ position: 'absolute', top: '40px', right: '0', width: '300px', backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: 2000, maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ padding: '15px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: text }}>Notifications</h4>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '16px' }}>✕</button>
          </div>
          
          {notifications.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>No new notifications</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((notif) => (
                <div key={notif.id} style={{ padding: '15px', borderBottom: `1px solid ${border}`, backgroundColor: notif.read ? 'transparent' : (darkMode ? '#2a2a2a' : '#f5f7ff') }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: text }}>{notif.message}</p>
                  <span style={{ fontSize: '10px', color: '#888' }}>{new Date(notif.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
