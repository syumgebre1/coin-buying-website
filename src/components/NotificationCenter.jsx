import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setNotifications(notifs.slice(0, 15));
      const unread = notifs.filter(n => n.read === false).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, []);

  const toggleOpen = async () => {
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);
    
    if (newOpenState && unreadCount > 0) {
      const unreadNotifs = notifications.filter(n => n.read === false);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      }
    }
  };

  const bg = darkMode ? '#1e1e1e' : 'white';
  const text = darkMode ? '#fff' : '#000';
  const border = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button 
        onClick={toggleOpen} 
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-5px', backgroundColor: '#ff0000', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: 'fixed', // Using fixed to bypass sidebar constraints
          top: '70px', // Position it just below the header
          left: '10px', // Align to the left edge
          width: '300px', 
          backgroundColor: bg, 
          border: `1px solid ${border}`, 
          borderRadius: '12px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', 
          zIndex: 9999, 
          maxHeight: '80vh', 
          overflowY: 'auto' 
        }}>
          <div style={{ padding: '15px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: darkMode ? '#252525' : '#f8f9fa', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
            <h4 style={{ margin: 0, color: text }}>Notifications</h4>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px', fontWeight: 'bold' }}>✕</button>
          </div>
          
          {notifications.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No notifications yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((notif) => (
                <div key={notif.id} style={{ 
                  padding: '15px', 
                  borderBottom: `1px solid ${border}`, 
                  backgroundColor: notif.read ? 'transparent' : (darkMode ? '#2a2a4a' : '#e8eaf6') 
                }}>
                  <p style={{ 
                    margin: '0 0 5px 0', 
                    fontSize: '13px', 
                    color: text, 
                    fontWeight: notif.read ? 'normal' : 'bold',
                    wordWrap: 'break-word', 
                    whiteSpace: 'normal',
                    lineHeight: '1.4'
                  }}>
                    {notif.message}
                  </p>
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
