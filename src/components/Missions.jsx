import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';

export default function Missions() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [casinoGamesPlayed, setCasinoGamesPlayed] = useState(0);
  const [friendsInvited, setFriendsInvited] = useState(0);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      
      // 1. Get Profile
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setProfile(docSnap.data());

      // 2. Count Casino Games Played
      const qCasino = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid), where("amount", "==", 0));
      const casinoSnap = await getDocs(qCasino);
      setCasinoGamesPlayed(casinoSnap.size);

      // 3. Count Friends Invited
      const qInvite = query(collection(db, "users"), where("referredBy", "==", auth.currentUser.uid));
      const inviteSnap = await getDocs(qInvite);
      setFriendsInvited(inviteSnap.size);
    };
    fetchData();
  }, []);

  const claimReward = async (missionId, rewardCoins) => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      
      const today = new Date().toDateString();
      const claimedData = userSnap.data().claimedMissions || { date: '', ids: [] };
      
      // Reset missions if it's a new day
      let claimedIds = claimedData.date === today ? claimedData.ids : [];

      if (claimedIds.includes(missionId)) {
        return toast.error("You already claimed this reward today!");
      }

      await updateDoc(userRef, {
        coins: currentCoins + rewardCoins,
        claimedMissions: { date: today, ids: [...claimedIds, missionId] }
      });
      
      toast.success(`Claimed ${rewardCoins} coins!`);
      setProfile({ ...profile, coins: currentCoins + rewardCoins, claimedMissions: { date: today, ids: [...claimedIds, missionId] } });
    } catch (e) {
      toast.error("Error claiming reward.");
    }
  };

  if (!profile) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading missions...</div>;

  const today = new Date().toDateString();
  const claimedIds = profile.claimedMissions?.date === today ? (profile.claimedMissions?.ids || []) : [];

  const missions = [
    { 
      id: 'daily_login', 
      title: 'Daily Login', 
      desc: 'Log in today to claim.', 
      reward: 10, 
      isCompleted: true 
    },
    { 
      id: 'play_casino', 
      title: 'Play 5 Casino Games', 
      desc: `You have played ${casinoGamesPlayed}/5 games.`, 
      reward: 50, 
      isCompleted: casinoGamesPlayed >= 5 
    },
    { 
      id: 'invite_friend', 
      title: 'Invite a Friend', 
      desc: `You have invited ${friendsInvited}/1 friends.`, 
      reward: 100, 
      isCompleted: friendsInvited >= 1 
    },
  ];

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      <h2 style={{ textAlign: 'center' }}>Daily Missions</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Complete tasks to earn free coins!</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {missions.map(mission => {
          const isClaimed = claimedIds.includes(mission.id);
          return (
            <div key={mission.id} style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: mission.isCompleted ? 1 : 0.6 }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{mission.title}</h3>
                <p style={{ margin: 0, color: mission.isCompleted ? '#4caf50' : '#d32f2f', fontSize: '12px', fontWeight: 'bold' }}>{mission.desc}</p>
              </div>
              <button 
                onClick={() => claimReward(mission.id, mission.reward)} 
                disabled={!mission.isCompleted || isClaimed}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: isClaimed ? '#9e9e9e' : mission.isCompleted ? '#4caf50' : '#e0e0e0', 
                  color: isClaimed || mission.isCompleted ? 'white' : '#666', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: (!mission.isCompleted || isClaimed) ? 'not-allowed' : 'pointer' 
                }}
              >
                {isClaimed ? 'Claimed' : mission.isCompleted ? `+${mission.reward} 🪙` : 'Incomplete'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
