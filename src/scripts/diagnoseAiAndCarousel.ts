import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

async function main() {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  console.log('Project:', config.projectId);
  const app = initializeApp(config);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'us-central1');

  const restSnap = await getDocs(collection(db, 'restaurants'));
  const rests = restSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown> & { id: string }>;
  const demo = rests.filter(
    (r) =>
      String(r.email ?? '').includes('demo') ||
      String(r.name ?? '').toLowerCase().includes('demo')
  );
  console.log(
    'Demo restaurants:',
    demo.map((r) => ({ id: r.id, name: r.name, email: r.email, active: r.active }))
  );

  for (const r of demo.slice(0, 5)) {
    const prods = await getDocs(query(collection(db, 'products'), where('restaurantId', '==', r.id)));
    const withImg = prods.docs.filter((d) => String(d.data().image ?? '').trim());
    const coca = prods.docs.filter((d) => /coca/i.test(String(d.data().name ?? '')));
    console.log(`Restaurant "${r.name}": ${prods.size} products, ${withImg.length} with image`);
    for (const d of coca) {
      const data = d.data();
      console.log(`  Coca: ${data.name} | image: ${String(data.image ?? '').slice(0, 100)}`);
    }
  }

  const sampleRestaurants = demo.slice(0, 1).map((r) => ({
    id: r.id,
    name: String(r.name ?? ''),
    address: String(r.address ?? ''),
    phone: String(r.phone ?? ''),
    products: [{ name: 'Pizza', description: 'test', price: 30, category: 'pizza' }],
  }));

  try {
    const fn = httpsCallable(functions, 'recommendRestaurantsWithAI');
    const res = await fn({
      userMessage: 'quero pizza',
      conversationHistory: [],
      restaurantsData:
        sampleRestaurants.length > 0
          ? sampleRestaurants
          : [
              {
                id: 'x',
                name: 'Test',
                address: '',
                phone: '',
                products: [{ name: 'Pizza', description: '', price: 10, category: 'pizza' }],
              },
            ],
    });
    console.log('AI callable OK:', JSON.stringify(res.data).slice(0, 400));
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; details?: unknown };
    console.error('AI callable ERROR:', err.code, err.message, err.details);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
