import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import { useContext } from 'react';

export default function SupportChat({ onClose }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "chats"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await addDoc(collection(db, "chats"), {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      sender: 'user',
      text: message,
      createdAt: new Date().toISOString()
    });
    setMessage('');
  };

  const bg = darkMode ? '#1e1e1e' : 'white';
  const text = darkMode ? '#fff' : '#000';
  const border = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ position: 'fixed', bottom: '80px', right: '20px', width: '300px', height: '400px', backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 1000 }}>
      <div style={{ padding: '15px', backgroundColor: '#1a237e', color: 'white', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Support Chat</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
      </div>
      
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && <p style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>How can we help you today?</p>}
        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#1a237e' : (darkMode ? '#333' : '#f0f0f0'), color: msg.sender === 'user' ? 'white' : text, padding: '8px 12px', borderRadius: '12px', maxWidth: '80%', fontSize: '13px', textAlign: 'left' }}>
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', padding: '10px', borderTop: `1px solid ${border}` }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '8px', borderRadius: '20px', border: `1px solid ${border}`, backgroundColor: 'transparent', color: text, outline: 'none' }} />
        <button type="submit" style={{ marginLeft: '10px', padding: '8px 15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  );
}
