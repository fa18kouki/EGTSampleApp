import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link } from "react-router-dom";
import styles from "./Login.module.css"; // CSSファイルをインポート

const Login: React.FC = () => {
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [company, setCompany] = useState<string>("");
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (errorMessage) {
      console.log(errorMessage);
      if (
        errorMessage === "auth/wrong-password" ||
        errorMessage === "auth/user-not-found"
      ) {
        setErrorMessage("メールアドレスまたはパスワードが間違っています");
      } else if (errorMessage === "auth/user-not-found") {
        setErrorMessage("ユーザーが見つかりませんでした");
      } else {
        setErrorMessage("エラーが発生しました");
      }
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
              <div className={styles.errorMessage}>{errorMessage}</div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>会社名</label>
                <input
                  name="company"
                  type="text"
                  value={company}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCompany(e.target.value)
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.emailErrorMessage}>{emailErrorMessage}</div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>メールアドレス</label>
                <input
                  name="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLoginEmail(e.target.value)
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.passwordErrorMessage}>{passwordErrorMessage}</div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>パスワード</label>
                <input
                  name="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLoginPassword(e.target.value)
                  }
                  className={styles.input}
                />
                <div className="inputGroup"></div>
              </div>
              <button className={styles.button}>ログイン</button>
              <p className={styles.signupText}>
                新規登録は
                <Link to={`/signup/`} className={styles.link}>
                  こちら
                </Link>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
