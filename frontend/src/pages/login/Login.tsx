import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link } from "react-router-dom";

const Login: React.FC = () => {
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      alert("メールアドレスまたはパスワードが間違っています");
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  return (
    <>
      {user ? (
        <Navigate to={`/`} />
      ) : (
        <>
          <h1>ログインページ</h1>
          <form onSubmit={handleSubmit}>
            <div>
              <label>メールアドレス</label>
              <input
                name="email"
                type="email"
                value={loginEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label>パスワード</label>
              <input
                name="password"
                type="password"
                value={loginPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginPassword(e.target.value)}
              />
            </div>
            <button>ログイン</button>
            <p>新規登録は<Link to={`/signup/`}>こちら</Link></p>
          </form>
        </>
      )}
    </>
  );
};

export default Login;
