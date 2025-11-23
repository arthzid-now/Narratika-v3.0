
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";
import { Story, CharacterProfile, WorldItem } from "../types";

// Initialize Firebase instances
// We use implicit types or simple any to avoid deep type issues if the environment definitions vary
let app: any;
let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;

if (isFirebaseConfigured()) {
  try {
    // Check if apps are already initialized to avoid duplicate init errors
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
  } catch (e) {
    console.error("Firebase Init Error:", e);
  }
} else {
  console.warn("Firebase belum dikonfigurasi di services/firebaseConfig.ts");
}

// Export User type
export type User = firebase.User;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase belum disetting.");
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) return;
  await auth.signOut();
};

export const getFirebaseUser = () => {
  if (!auth) return null;
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return auth.onAuthStateChanged(callback);
};

// --- LOGIC PENYIMPANAN CERDAS (Text-Only) ---

// Helper: Hapus gambar dari object Story sebelum upload
const stripImages = (story: Story): Story => {
  // Deep clone biar state asli di UI gak berubah
  const cleanStory = JSON.parse(JSON.stringify(story));

  // Hapus gambar karakter
  if (cleanStory.characters) {
    cleanStory.characters = cleanStory.characters.map((c: CharacterProfile) => ({
      ...c,
      avatarBase64: undefined // Hapus data gambar
    }));
  }

  // Hapus gambar world items
  if (cleanStory.worldItems) {
    cleanStory.worldItems = cleanStory.worldItems.map((w: WorldItem) => ({
      ...w,
      imageUrl: undefined // Hapus data gambar
    }));
  }

  return cleanStory;
};

export const syncStoriesToCloud = async (userId: string, stories: Story[]) => {
  if (!db) throw new Error("Firebase DB not init");
  
  const promises = stories.map(story => {
    const cleanData = stripImages(story);
    // Path: users/{userId}/stories/{story.id}
    const storyRef = db!.collection("users").doc(userId).collection("stories").doc(story.id);
    return storyRef.set(cleanData, { merge: true });
  });

  await Promise.all(promises);
  return true;
};

export const fetchStoriesFromCloud = async (userId: string): Promise<Story[]> => {
  if (!db) throw new Error("Firebase DB not init");

  // Path: users/{userId}/stories
  const storiesRef = db!.collection("users").doc(userId).collection("stories");
  const snapshot = await storiesRef.get();
  
  const stories: Story[] = [];
  snapshot.forEach(doc => {
    stories.push(doc.data() as Story);
  });
  
  return stories;
};

// --- SMART MERGE ---
// Gabungin data Cloud (Teks Terbaru) dengan Local (Gambar)
export const mergeCloudAndLocal = (localStories: Story[], cloudStories: Story[]): Story[] => {
  return cloudStories.map(cloudStory => {
    // Cari versi lokal dari cerita ini
    const localMatch = localStories.find(ls => ls.id === cloudStory.id);

    if (!localMatch) {
      // Kalau gak ada di lokal (cerita baru dari cloud), ya ambil apa adanya (tanpa gambar)
      return cloudStory;
    }

    // Kalau ada di lokal, kita "jahit" ulang gambarnya
    const mergedCharacters = (cloudStory.characters || []).map(cloudChar => {
      const localChar = (localMatch.characters || []).find(lc => lc.id === cloudChar.id);
      return {
        ...cloudChar,
        // Pakai gambar lokal jika ada, karena di cloud pasti kosong
        avatarBase64: localChar?.avatarBase64 || undefined
      };
    });

    const mergedWorldItems = (cloudStory.worldItems || []).map(cloudItem => {
      const localItem = (localMatch.worldItems || []).find(li => li.id === cloudItem.id);
      return {
        ...cloudItem,
        imageUrl: localItem?.imageUrl || undefined
      };
    });

    return {
      ...cloudStory,
      characters: mergedCharacters,
      worldItems: mergedWorldItems
    };
  });
};
