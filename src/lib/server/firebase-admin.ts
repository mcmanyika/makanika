import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";

let initialized = false;

function loadServiceAccount(): admin.ServiceAccount | undefined {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    return JSON.parse(jsonEnv) as admin.ServiceAccount;
  }

  const path = resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./service-account.json"
  );

  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as admin.ServiceAccount;
}

export function getAdminApp(): admin.app.App {
  if (!initialized) {
    const existing = admin.apps[0];
    if (existing) {
      initialized = true;
      return existing;
    }

    const serviceAccount = loadServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId:
          process.env.FIREBASE_PROJECT_ID ??
          process.env.GCLOUD_PROJECT ??
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      throw new Error(
        "Firebase Admin not configured. Add service-account.json or FIREBASE_SERVICE_ACCOUNT_JSON."
      );
    }
    initialized = true;
  }
  return admin.app();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}
