import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../ThemeContext';
import toast from 'react-hot-toast';

export default function Missions() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setProfile(docSnap.data());
    };
    fetchProfile();
  }, []);

  const claimReward = async (missionName, rewardCoins) => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data().coins || 0;
      const claimed = userSnap.data().claimedMissions || [];

      if (claimed.includes(missionName)) {
        return toast.error("You already claimed this reward!");
      }

      await updateDoc(userRef, {
        coins: currentCoins + rewardCoins,
        claimedMissions: [...claimed, missionName]
      });
      
      toast.success(`Claimed ${rewardCoins} coins!`);
      setProfile({ ...profile, coins: currentCoins + rewardCoins, claimedMissions: [...claimed, missionName] });
    } catch (e) {
      toast.error("Error claiming reward.");
    }
  };

  const cardBg = darkMode ? '#1e1e1e' : 'white';
  const cardBorder = darkMode ? '#333' : '#ccc';
  const textColor = darkMode ? '#fff' : '#000';

  if (!profile) return <div>Loading...</div>;

  const missions = [
    { id: 'daily_login', title: 'Daily Login', desc: 'Log in today to claim.', reward: 10 },
    { id: 'play_casino', title: 'Play 5 Casino Games', desc: 'Try your luck in the casino.', reward: 50 },
    { id: 'invite_friend', title: 'Invite a Friend', desc: 'Share your referral code.', reward: 100 },
  ];

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', color: textColor }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: textColor }}>← Back</button>
      <h2 style={{ textAlign: 'center' }}>Daily Missions</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Complete tasks to earn free coins!</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {missions.map(mission => {
          const isClaimed = profile.claimedMissions?.includes(mission.id);
          return (
            <div key={mission.id} style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{mission.title}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>{mission.desc}</p>
              </div>
              <button 
                onClick={() => claimReward(mission.id, mission.reward)} 
                disabled={isClaimed}
                style={{ padding: '10px 20px', backgroundColor: isClaimed ? '#9e9e9e' : '#4caf50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isClaimed ? 'not-allowed' : 'pointer' }}
              >
                {isClaimed ? 'Claimed' : `+${mission.reward} 🪙`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
