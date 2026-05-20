import {
  DocumentData,
  Timestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";

function convertValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }
  if (value !== null && typeof value === "object") {
    return convertTimestamps(value as Record<string, unknown>);
  }
  return value;
}

export function convertTimestamps<T extends Record<string, unknown>>(
  data: T
): T {
  const result = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    result[key] = convertValue(result[key]);
  }
  return result as T;
}

export function docToEntity<T extends { id: string }>(
  snap: QueryDocumentSnapshot<DocumentData>
): T {
  return {
    id: snap.id,
    ...convertTimestamps(snap.data() as Record<string, unknown>),
  } as T;
}

export function dateToTimestamp(value: Date | Timestamp | undefined) {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value;
  return Timestamp.fromDate(value instanceof Date ? value : new Date(value));
}
