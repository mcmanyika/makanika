import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";

let initialized = false;

function getProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

function loadServiceAccount(): admin.ServiceAccount | undefined {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv) as admin.ServiceAccount;
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON."
      );
    }
  }

  const path = resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./service-account.json"
  );

  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as admin.ServiceAccount;
}

/** True when Admin can verify Firebase Auth ID tokens (not projectId-only init). */
export function hasAdminAuthCredentials(): boolean {
  if (loadServiceAccount()) return true;
  return Boolean(
    process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET
  );
}

export function getAdminApp(): admin.app.App {
  if (!initialized) {
    const existing = admin.apps[0];
    if (existing) {
      initialized = true;
      return existing;
    }

    const projectId = getProjectId();
    const serviceAccount = loadServiceAccount();

    if (serviceAccount) {
      const sa = serviceAccount as admin.ServiceAccount & {
        project_id?: string;
      };
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: sa.projectId ?? sa.project_id ?? projectId,
      });
    } else if (
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.K_SERVICE
    ) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } else if (projectId) {
      // Local fallback only — token verification will fail without credentials
      admin.initializeApp({ projectId });
    } else {
      throw new Error(
        "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or NEXT_PUBLIC_FIREBASE_PROJECT_ID."
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
