import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";

let initialized = false;

function getProjectId(): string | undefined {
  if (process.env.FIREBASE_CONFIG?.trim()) {
    try {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG) as {
        projectId?: string;
      };
      if (cfg.projectId) return cfg.projectId;
    } catch {
      /* fall through */
    }
  }
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

function parseServiceAccountJson(raw: string): admin.ServiceAccount {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s) as string;
    } catch {
      /* use original */
    }
  }
  return JSON.parse(s) as admin.ServiceAccount;
}

function loadServiceAccount(): admin.ServiceAccount | undefined {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    try {
      return parseServiceAccountJson(jsonEnv);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. Paste the service account file as a single line."
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

function isGcpRuntime(): boolean {
  return Boolean(
    process.env.FIREBASE_CONFIG?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET
  );
}

/** True when Admin can verify Firebase Auth ID tokens. */
export function hasAdminAuthCredentials(): boolean {
  if (loadServiceAccount()) return true;
  return isGcpRuntime() && Boolean(getProjectId());
}

function initAdminApp(): admin.app.App {
  const projectId = getProjectId();
  const serviceAccount = loadServiceAccount();
  const firebaseConfig = process.env.FIREBASE_CONFIG?.trim();

  if (serviceAccount) {
    const sa = serviceAccount as admin.ServiceAccount & {
      project_id?: string;
    };
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: sa.projectId ?? sa.project_id ?? projectId,
    });
  } else if (firebaseConfig) {
    // Firebase App Hosting: FIREBASE_CONFIG + ADC (no service account JSON needed)
    admin.initializeApp();
  } else if (isGcpRuntime() && projectId) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  } else if (projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } catch {
      admin.initializeApp({ projectId });
    }
  } else {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, deploy on Firebase App Hosting, or set NEXT_PUBLIC_FIREBASE_PROJECT_ID."
    );
  }

  return admin.app();
}

export function getAdminApp(): admin.app.App {
  if (!initialized) {
    const existing = admin.apps[0];
    if (existing) {
      initialized = true;
      return existing;
    }
    initAdminApp();
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
