import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function SupportChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "support_chats"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await addDoc(collection(db, "support_chats"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        sender: 'user',
        text: newMessage,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) { toast.error("Failed to send message."); }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>🎧 Customer Support</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>We usually reply within minutes.</p>
      </div>

      <div style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg) => {
          const isAdmin = msg.sender === 'admin';
          return (
            <div key={msg.id} style={{ alignSelf: isAdmin ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
              <div style={{ backgroundColor: isAdmin ? '#d32f2f' : '#1a237e', color: 'white', padding: '10px 15px', borderRadius: '15px' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #ccc' }} />
        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>Send</button>
      </form>
    </div>
  );
}
