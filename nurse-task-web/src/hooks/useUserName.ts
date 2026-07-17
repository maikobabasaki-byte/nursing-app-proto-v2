import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useUserName = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const id = user.email.split('@')[0];
        try {
          const userDoc = await getDoc(doc(db, 'users', id));
          setUserName(userDoc.exists() ? userDoc.data().name : id);
        } catch (e) {
          setUserName(id);
        }
      } else {
        setUserName('');
      }
    });
    return () => unsubscribe();
  }, []);

  return userName;
};