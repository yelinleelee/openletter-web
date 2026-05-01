import { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { api, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'guest' | 'host' | 'admin';
  avatar?: string | null;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

async function exchangeFirebaseToken(fbUser: FirebaseUser): Promise<AppUser> {
  const idToken = await fbUser.getIdToken();
  const { data } = await api.post<{ user: AppUser; token: string }>('/auth/firebase-login', {
    idToken,
  });
  setStoredToken(data.token);
  return data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        clearStoredToken();
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // 토큰이 이미 있어도 새로고침 시 서버 사용자 정보(role 포함)를 다시 가져와 동기화
        const appUser = await exchangeFirebaseToken(fbUser);
        setUser(appUser);
      } catch (e) {
        console.error('Firebase ↔ 서버 인증 동기화 실패:', e);
        clearStoredToken();
        setUser(null);
        // Firebase 세션은 살아있지만 서버 동기화 실패 시 Firebase도 로그아웃
        await firebaseSignOut(auth);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = await exchangeFirebaseToken(result.user);
      setUser(appUser);
    } catch (e) {
      console.error('Login error:', e);
      clearStoredToken();
      throw e;
    }
  };

  const signOut = async () => {
    clearStoredToken();
    setUser(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { getStoredToken };
