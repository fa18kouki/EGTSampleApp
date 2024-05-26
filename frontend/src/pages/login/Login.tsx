import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link } from "react-router-dom";
import styles from "./Login.module.css"; // CSSファイルをインポート

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
        <div className={styles.container}>
          <div className={styles.formWrapper}>
            <h1 className={styles.title}>ログインページ</h1>
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>メールアドレス</label>
                <input
                  name="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginEmail(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>パスワード</label>
                <input
                  name="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginPassword(e.target.value)}
                  className={styles.input}
                />
              </div>
              <button className={styles.button}>ログイン</button>
              <p className={styles.signupText}>新規登録は<Link to={`/signup/`} className={styles.link}>こちら</Link></p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;