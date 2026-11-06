import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, runTransaction, addDoc, Timestamp } from 'firebase/firestore';
const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
const app = initializeApp(cfg);
const db = getFirestore(app);
const cutoff = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
const snap = await getDocs(query(collection(db, 'users'), where('lastActive', '>=', cutoff)));
if (snap.empty) { console.log('No active users'); process.exit(0); }
const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const winner = users[Math.floor(Math.random() * users.length)];
await runTransaction(db, async (tx) => {
  const ref = doc(db, 'users', winner.id);
  const cur = await tx.get(ref);
  tx.update(ref, { coins: (cur.data().coins || 0) + 50 });
});
await addDoc(collection(db, 'transactions'), {
  userId: winner.id, userEmail: winner.email || '', amount: 0, coins: 0,
  method: 'Surprise Drop', status: 'won', winAmount: 50,
  receiptUrl: '', createdAt: new Date().toISOString(),
});
console.log(`🎁 Dropped 50 coins to ${winner.id}`);
