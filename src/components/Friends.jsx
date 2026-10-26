import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction, addDoc } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';

export default function Friends() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const { darkMode } = useContext(ThemeContext);

  const fetchFriendsData = async () => {
    if (!auth.currentUser) return;
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setProfile(data);
      
      if (data.friends && data.friends.length > 0) {
        const friendPromises = data.friends.map(email => getDocs(query(collection(db, "users"), where("email", "==", email))));
        const friendSnaps = await Promise.all(friendPromises);
        const friendsList = [];
        friendSnaps.forEach(snap => {
          if (!snap.empty) friendsList.push({ id: snap.docs[0].id, ...snap.docs[0].data() });
        });
        setFriends(friendsList);
      }
    }
  };

  useEffect(() => { fetchFriendsData(); }, []);

  const addFriend = async () => {
    if (!searchEmail) return;
    if (searchEmail === auth.currentUser.email) return toast.error("You can't add yourself!");
    if (profile.friends?.includes(searchEmail)) return toast.error("Already friends!");

    try {
      const q = query(collection(db, "users"), where("email", "==", searchEmail));
      const snap = await getDocs(q);
      if (snap.empty) return toast.error("User not found!");

      const newFriendsList = [...(profile.friends || []), searchEmail];
      await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: newFriendsList });
      
      setProfile({ ...profile, friends: newFriendsList });
      setSearchEmail('');
      toast.success("Friend added successfully!");
      fetchFriendsData();
    } catch (e) { toast.error("Error adding friend."); }
  };

  const sendCoins = async () => {
    const amount = Number(sendAmount);
    if (amount <= 0 || amount > profile.coins) return toast.error("Invalid amount or insufficient funds.");
    if (!selectedFriend) return toast.error("Select a friend first.");

    try {
      const senderRef = doc(db, "users", auth.currentUser.uid);
      const receiverRef = doc(db, "users", selectedFriend.id);

      await runTransaction(db, async (transaction) => {
        const senderDoc = await transaction.get(senderRef);
        const receiverDoc = await transaction.get(receiverRef);
        if (!senderDoc.exists() || !receiverDoc.exists()) throw "User does not exist!";
        
        const senderBalance = senderDoc.data().coins || 0;
        const receiverBalance = receiverDoc.data().coins || 0;
        if (senderBalance < amount) throw "Insufficient funds!";

        transaction.update(senderRef, { coins: senderBalance - amount });
        transaction.update(receiverRef, { coins: receiverBalance + amount });
      });

      // CRITICAL FIX: Add the notification document to Firestore
      await addDoc(collection(db, "notifications"), {
        userId: selectedFriend.id,
        message: `💸 You received ${amount} coins from ${auth.currentUser.email}`,
        type: 'transfer',
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success(`Sent ${amount} coins to ${selectedFriend.email}!`);
      setProfile({ ...profile, coins: profile.coins - amount });
      setFriends(friends.map(f => f.id === selectedFriend.id ? { ...f, coins: (f.coins || 0) + amount } : f));
      setSendAmount('');
      setSelectedFriend(null);
    } catch (e) {
      console.error(e);
      toast.error(typeof e === 'string' ? e : "Transfer failed.");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  if (!profile) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      <h2 style={{ textAlign: 'center' }}>Social & Friends</h2>
      
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ margin: 0 }}>Your Balance: 🪙 {profile.coins} Coins</p>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Add a Friend</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="email" placeholder="Enter friend's email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: `1px solid ${cardBorder}`, color: textColor, backgroundColor: darkMode ? '#121212' : 'white' }} />
          <button onClick={addFriend} style={{ padding: '10px 20px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
        </div>
      </div>

      <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Your Friends ({friends.length})</h3>
        {friends.length === 0 ? <p style={{ fontSize: '12px', color: '#666' }}>No friends added yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {friends.map(friend => (
              <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '10px' }}>
                <div>
                  <strong>{friend.email}</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Balance: 🪙 {friend.coins || 0}</p>
                </div>
                <button onClick={() => setSelectedFriend(friend)} style={{ padding: '5px 10px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Send Coins</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFriend && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '350px', color: '#000' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Send Coins to {selectedFriend.email}</h3>
            <input type="number" placeholder="Amount of Coins" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={sendCoins} style={{ flex: 1, padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm</button>
              <button onClick={() => setSelectedFriend(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
