/* SERA Apply — Firebase sign-in and account storage.
   Firebase Authentication checks email and password, or signs the student in with Google.
   Each student's account lives in Firestore:
     users/{uid}     the account: SERA ID, email, profile, shortlist, applications
     srids/{SRID}    { uid } — claims a SERA ID so no two students share one
     phones/{+255…}  { uid } — claims a mobile number so one person keeps one account
   firestore.rules lets each student read and write only their own documents. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, sendEmailVerification, sendPasswordResetEmail, reload,
  deleteUser, reauthenticateWithCredential, EmailAuthProvider,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, reauthenticateWithPopup, getRedirectResult,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction, writeBatch,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const configured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth = null, fs = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Emails from Firebase (verification, password reset) and the Google screen follow the browser's language.
  auth.useDeviceLanguage();
  // Memory cache only (the default): nothing about the student stays on a shared computer after sign-out.
  fs = getFirestore(app);
}

const userRef = (uid) => doc(fs, "users", uid);
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined values.
const google = () => { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return p; };

// While sign-up is writing the account, ignore the auth event it triggers; signUp reports the result itself.
let signingUp = false;

/* Calls back on every sign-in and sign-out:
     (account, user)  signed in and the account exists
     (null, user)     signed in to Firebase (for example with Google for the first time) but no SERA account yet
     (null, null)     signed out
   A third argument carries an error, if any. */
export function onAccount(cb) {
  if (!configured) { cb(null, null); return; }
  // Errors from a Google redirect sign-in (used when popups are blocked) arrive here.
  getRedirectResult(auth).catch((e) => cb(null, null, e));
  onAuthStateChanged(auth, async (user) => {
    if (signingUp) return;
    if (!user) { cb(null, null); return; }
    try {
      const snap = await getDoc(userRef(user.uid));
      cb(snap.exists() ? snap.data() : null, user);
    } catch (e) {
      cb(null, null, e);
    }
  });
}

/* Sign in with Google in a popup. If the browser blocks popups, go to Google's page and come back instead. */
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, google());
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, google());
      return;
    }
    throw e;
  }
}

function randomSrid() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0];
  return "SRID" + String(10000 + (n % 90000));
}

/* For the signed-in Firebase user: claims a SERA ID (and the phone number, if given) and writes the account in one transaction. */
export async function createAccount({ phone, phoneKey, account }) {
  const user = auth.currentUser;
  const uid = user.uid, email = user.email; // Firebase's stored form of the email; the rules check it matches.
  let srid;
  for (let tries = 0; !srid && tries < 8; tries++) {
    srid = await runTransaction(fs, async (tx) => {
      // The mobile number is optional; only a number that was given is claimed.
      const phoneDoc = phoneKey ? doc(fs, "phones", phoneKey) : null;
      const candidate = randomSrid();
      const sridDoc = doc(fs, "srids", candidate);
      const [p, s] = await Promise.all([phoneDoc ? tx.get(phoneDoc) : null, tx.get(sridDoc)]);
      if (p && p.exists()) { const e = new Error("Phone already used"); e.code = "sera/phone-in-use"; throw e; }
      if (s.exists()) return null; // Rare clash: try another number.
      const full = clean({ ...account, srid: candidate, email, uid, ...(phoneKey ? { phoneClaim: phoneKey } : {}) });
      full.profile.contact = { ...full.profile.contact, email, ...(phone ? { phone } : {}) };
      tx.set(sridDoc, { uid });
      if (phoneDoc) tx.set(phoneDoc, { uid });
      tx.set(userRef(uid), full);
      return candidate;
    });
  }
  if (!srid) { const e = new Error("No SERA ID"); e.code = "sera/no-srid"; throw e; }
  const snap = await getDoc(userRef(uid));
  return { account: snap.data(), user };
}

/* Creates the Firebase user with email and password, then the account.
   If any step fails, the Firebase user is removed again so the email can be reused. */
export async function signUp({ email, password, phone, phoneKey, account }) {
  signingUp = true;
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
    const res = await createAccount({ phone, phoneKey, account });
    sendEmailVerification(cred.user).catch(() => { /* the dashboard offers to resend */ });
    return res;
  } catch (e) {
    if (cred) await deleteUser(cred.user).catch(() => fbSignOut(auth));
    throw e;
  } finally {
    signingUp = false;
  }
}

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const signOut = () => fbSignOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const resendVerification = () => sendEmailVerification(auth.currentUser);

/* True when the student has a password (signed up with email); false for Google-only accounts. */
export const usesPassword = () => !!auth?.currentUser?.providerData.some((p) => p.providerId === "password");

/* Reloads the Firebase user so a link clicked in another tab shows up. */
export async function isVerified() {
  const u = auth?.currentUser;
  if (!u) return false;
  await reload(u).catch(() => {});
  return u.emailVerified;
}

/* Writes the whole account. The rules stop the SERA ID, email and join date from changing. */
export function save(account) {
  const u = auth?.currentUser;
  if (!u) return Promise.reject(new Error("Not signed in"));
  return setDoc(userRef(u.uid), clean(account));
}

/* Deletes the account documents and the Firebase user. Firebase needs a recent sign-in first:
   the password for email accounts, or Google again for Google accounts. */
export async function deleteAccount(password, account) {
  const u = auth.currentUser;
  if (usesPassword()) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
  else await reauthenticateWithPopup(u, google());
  const batch = writeBatch(fs);
  batch.delete(userRef(u.uid));
  if (account.srid) batch.delete(doc(fs, "srids", account.srid));
  if (account.phoneClaim) batch.delete(doc(fs, "phones", account.phoneClaim));
  await batch.commit();
  await deleteUser(u);
}
