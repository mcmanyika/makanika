import {
  getAdminAuth,
  getAdminFirestore,
  hasAdminAuthCredentials,
} from "@/lib/server/firebase-admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { User, UserRole } from "@/types";

export interface AuthenticatedRequest {
  uid: string;
  user: User;
}

function mapUserDoc(uid: string, data: FirebaseFirestore.DocumentData): User {
  return {
    id: uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: data.role as UserRole,
    shopId: data.shopId as string | undefined,
    customerId: data.customerId as string | undefined,
    photoURL: data.photoURL as string | undefined,
    phone: data.phone as string | undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function verifyRequestAuth(
  request: Request
): Promise<AuthenticatedRequest> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing authorization token.", 401);
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw new AuthError("Missing authorization token.", 401);
  }

  if (!hasAdminAuthCredentials()) {
    throw new AuthError(
      "Chat is not configured on the server. Add FIREBASE_SERVICE_ACCOUNT_JSON to your production environment (Firebase App Hosting secret or hosting env vars).",
      503
    );
  }

  let decoded: { uid: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch (err) {
    console.error("[verifyIdToken]", err);
    throw new AuthError(
      "Invalid or expired session. Sign out, sign in again, and retry.",
      401
    );
  }

  const userSnap = await getAdminFirestore()
    .collection(COLLECTIONS.users)
    .doc(decoded.uid)
    .get();

  if (!userSnap.exists) {
    throw new AuthError("User profile not found.", 403);
  }

  const user = mapUserDoc(decoded.uid, userSnap.data()!);

  if (!user.shopId) {
    throw new AuthError("Account is not linked to a shop.", 403);
  }

  return { uid: decoded.uid, user };
}

export function isShopStaff(role: UserRole): boolean {
  return role === "shop_admin" || role === "mechanic";
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
