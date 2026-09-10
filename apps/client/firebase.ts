import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
const app = initializeApp({
  apiKey: "AIzaSyD6UAbFSy7WKEBZhW-Y6UkyVycGRCNsNzA",
  authDomain: "lead-57c78.firebaseapp.com",
  projectId: "lead-57c78",
  storageBucket: "lead-57c78.firebasestorage.app",
  messagingSenderId: "324375724704",
  appId: "1:324375724704:web:86e87f39f5716053323fc5",
  measurementId: "G-J30MNCDVWV",
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fn = getFunctions(app, "us-central1");
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(fn, "127.0.0.1", 5001);
}
// Analytics is intentionally opt-in; no child activity is sent to Analytics by default.
export async function cloud(
  operation: string,
  data: Record<string, unknown> = {},
) {
  return (await httpsCallable(fn, "leadAction")({ operation, ...data }))
    .data as any;
}
export function friendlyError(error: any) {
  const code = error?.code || "";
  if (/configuration-not-found|operation-not-allowed/.test(code))
    return "Firebase sign-in is not enabled yet. The project owner needs to enable Email/Password in Firebase Authentication. You can still try Practice Adventure.";
  if (/network-request-failed|unavailable|internal/.test(code))
    return "The cloud service is unavailable. Check your connection, or try Practice Adventure. Your cloud progress has not been changed.";
  if (/invalid-credential|wrong-password|user-not-found/.test(code))
    return "That email and password did not match. Please try again or reset your password.";
  if (/email-already-in-use/.test(code))
    return "This email already has an account. Please log in.";
  if (/weak-password/.test(code))
    return "Choose a password of at least 8 characters.";
  return String(
    error?.message || "Something went wrong. Please try again.",
  ).replace(/^Firebase: /, "");
}
