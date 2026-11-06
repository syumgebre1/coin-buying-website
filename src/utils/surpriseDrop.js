import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, runTransaction, addDoc, Timestamp } from 'firebase/firestore';
const DROP_AMOUNT = 50;
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
export async function runSurpriseDrop() {
  const cutoff = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
  const snap = await getDocs(query(collection(db, 'users'), where('lastActive', '>=', cutoff)));
  if (snap.empty) return { awarded: false };
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const winner = users[Math.floor(Math.random() * users.length)];
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'users', winner.id);
    const cur = await tx.get(ref);
    tx.update(ref, { coins: (cur.data().coins || 0) + DROP_AMOUNT });
  });
  await addDoc(collection(db, 'transactions'), {
    userId: winner.id, userEmail: winner.email || '', amount: 0, coins: 0,
    method: 'Surprise Drop', status: 'won', winAmount: DROP_AMOUNT,
    receiptUrl: '', createdAt: new Date().toISOString(),
  });
  return { awarded: true, userId: winner.id, amount: DROP_AMOUNT };
}
