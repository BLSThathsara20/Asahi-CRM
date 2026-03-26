import {
	collection,
	deleteDoc,
	doc,
	getDocs,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";
import { FIRESTORE_EXTRA_ALLOWED_COLLECTION } from "../constants.js";
import { db } from "../firebase.js";
import { normalizeEmail } from "../utils/accessControl.js";

export async function listInvitedEmails() {
	if (!db) return [];
	const snap = await getDocs(collection(db, FIRESTORE_EXTRA_ALLOWED_COLLECTION));
	return snap.docs
		.map((d) => ({
			id: d.id,
			...d.data(),
		}))
		.sort((a, b) => String(a.email || a.id).localeCompare(String(b.email || b.id)));
}

export async function addInvitedEmail(rawEmail, addedByEmail) {
	if (!db) throw new Error("Database not available");
	const email = normalizeEmail(rawEmail);
	if (!email.includes("@")) throw new Error("Enter a valid email address");
	await setDoc(doc(db, FIRESTORE_EXTRA_ALLOWED_COLLECTION, email), {
		email,
		addedBy: normalizeEmail(addedByEmail),
		addedAt: serverTimestamp(),
	});
}

export async function removeInvitedEmail(rawEmail) {
	if (!db) throw new Error("Database not available");
	const email = normalizeEmail(rawEmail);
	await deleteDoc(doc(db, FIRESTORE_EXTRA_ALLOWED_COLLECTION, email));
}
