import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getApp());
}

let functionsEmulatorConnected = false;

export function getFirebaseFunctions(): Functions {
  const fns = getFunctions(getApp());
  const useEmulator =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true";

  if (useEmulator && !functionsEmulatorConnected) {
    connectFunctionsEmulator(fns, "localhost", 5001);
    functionsEmulatorConnected = true;
  }

  return fns;
}

// Lazy proxies for modules that import named exports
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return Reflect.get(getFirebaseAuth() as object, prop);
  },
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return Reflect.get(getFirebaseDb() as object, prop);
  },
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    return Reflect.get(getFirebaseStorage() as object, prop);
  },
});

export const functions = new Proxy({} as Functions, {
  get(_target, prop) {
    return Reflect.get(getFirebaseFunctions() as object, prop);
  },
});

export default { getApp, isFirebaseConfigured };
