import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';

export default function LiveChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const { darkMode } = useContext(ThemeContext);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMyName = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setMyUsername(userDoc.data().username || auth.currentUser.email.split('@')[0]);
        } else {
          setMyUsername(auth.currentUser.email.split('@')[0]);
        }
      } catch (err) {
        setMyUsername("User");
      }
    };
    fetchMyName();

    // Listen to the last 50 messages safely
    const q = query(collection(db, "global_chat"), orderBy("createdAt", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error loading chat:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    try {
      // Just save the message. No notification loops!
      await addDoc(collection(db, "global_chat"), {
        text: messageText,
        userId: auth.currentUser.uid,
        username: myUsername,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Chat Error:", error);
      toast.error("Failed to send message.");
      setNewMessage(messageText); // Put the text back so they don't lose it
    }
  };

  const bg = darkMode ? '#1e1e1e' : 'white';
  const text = darkMode ? '#fff' : '#000';
  const border = darkMode ? '#333' : '#ccc';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', color: text }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: text, alignSelf: 'flex-start' }}>← Back</button>
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>💬 Global Lobby</h2>
      </div>

      <div style={{ flex: 1, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === auth.currentUser?.uid;
            return (
              <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px', textAlign: isMe ? 'right' : 'left' }}>
                  {isMe ? 'You' : (msg.username || 'User')}
                </div>
                <div style={{ backgroundColor: isMe ? '#1a237e' : (darkMode ? '#333' : '#f0f0f0'), color: isMe ? 'white' : text, padding: '10px 15px', borderRadius: '15px', borderBottomRightRadius: isMe ? '0' : '15px', borderBottomLeftRadius: isMe ? '15px' : '0', fontSize: '14px' }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Say something nice..." style={{ flex: 1, padding: '12px', borderRadius: '20px', border: `1px solid ${border}`, backgroundColor: bg, color: text, outline: 'none' }} />
        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  );
}
