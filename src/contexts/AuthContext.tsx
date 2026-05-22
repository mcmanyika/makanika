"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { User, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (params: SignUpParams) => Promise<User>;
  signOut: () => Promise<void>;
}

export interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_SHOP_ID = "shop_001";

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "permission-denied":
      return "Permission denied. Deploy the latest Firestore rules: firebase deploy --only firestore:rules";
    default:
      return "Authentication failed. Please try again.";
  }
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object" && "code" in err) {
    return new Error(mapAuthError(String((err as { code: string }).code)));
  }
  return new Error("Something went wrong. Please try again.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const signUpInProgress = useRef(false);

  const fetchUserProfile = useCallback(async (uid: string): Promise<User | null> => {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, uid));
    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() } as User;
      setUser(profile);
      return profile;
    }
    setUser(null);
    return null;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && !signUpInProgress.current) {
        await fetchUserProfile(fbUser.uid);
      } else if (!fbUser) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string): Promise<User> => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured.");
    }
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      const profile = await fetchUserProfile(cred.user.uid);
      if (!profile) {
        throw new Error(
          "No user profile found. Run npm run seed to set up demo accounts."
        );
      }
      return profile;
    } catch (err: unknown) {
      throw toError(err);
    }
  };

  const signUp = async ({
    email,
    password,
    displayName,
    role,
    phone,
  }: SignUpParams): Promise<User> => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured.");
    }

    signUpInProgress.current = true;
    let authUser: FirebaseUser | null = null;

    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      authUser = cred.user;
      await updateProfile(cred.user, { displayName });

      // 1. Create user profile first (required for security rules that read userDoc)
      await setDoc(doc(getFirebaseDb(), COLLECTIONS.users, cred.user.uid), {
        email,
        displayName,
        role,
        shopId: DEFAULT_SHOP_ID,
        phone: phone ?? null,
        customerId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      let customerId: string | undefined;

      // 2. Customers get a linked customer record
      if (role === "customer") {
        const nameParts = displayName.trim().split(/\s+/);
        const firstName = nameParts[0] ?? displayName;
        const lastName = nameParts.slice(1).join(" ") || firstName;

        const customerRef = await addDoc(
          collection(getFirebaseDb(), COLLECTIONS.customers),
          {
            shopId: DEFAULT_SHOP_ID,
            userId: cred.user.uid,
            firstName,
            lastName,
            email,
            phone: phone ?? "",
            vehicleIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
        customerId = customerRef.id;

        await updateDoc(doc(getFirebaseDb(), COLLECTIONS.users, cred.user.uid), {
          customerId,
          updatedAt: serverTimestamp(),
        });
      }

      const fullUser: User = {
        id: cred.user.uid,
        email,
        displayName,
        role,
        shopId: DEFAULT_SHOP_ID,
        customerId,
        phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setUser(fullUser);
      return fullUser;
    } catch (err: unknown) {
      // Roll back Auth user if Firestore writes failed
      if (authUser) {
        try {
          await deleteUser(authUser);
        } catch {
          // ignore cleanup errors
        }
      }
      throw toError(err);
    } finally {
      signUpInProgress.current = false;
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured) return;
    await firebaseSignOut(getFirebaseAuth());
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, loading } = useAuth();
  const roleAllowed =
    !allowedRoles || (user && allowedRoles.includes(user.role));
  return {
    user,
    loading,
    isAuthorized: !!user && roleAllowed,
    isAuthenticated: !!user,
  };
}

export function getRedirectForRole(role: UserRole): string {
  return role === "customer" ? "/portal/appointments" : "/appointments";
}
