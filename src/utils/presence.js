import { auth, db } from '../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
export function startPresenceHeartbeat() {
  if (!auth.currentUser) return () => {};
  const uid = auth.currentUser.uid;
  const ping = () => updateDoc(doc(db, 'users', uid), { lastActive: serverTimestamp() }).catch(() => {});
  ping();
  const id = setInterval(ping, 60000);
  return () => clearInterval(id);
}
