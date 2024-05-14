import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-Px5ZTFrAWw86wBwVJ5tGfYmgi_OgzGA",
  authDomain: "egt-gpt.firebaseapp.com",
  projectId: "egt-gpt",
  storageBucket: "egt-gpt.appspot.com",
  messagingSenderId: "950109849544",
  appId: "1:950109849544:web:b83fdae9a1e6022642e2fd",
  measurementId: "G-PS2C18FFCE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);