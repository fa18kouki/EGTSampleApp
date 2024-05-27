import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link } from "react-router-dom";

const SignUp: React.FC = () => {
  const [registerEmail, setRegisterEmail] = useState<string>("");
  const [registerPassword, setRegisterPassword] = useState<string>("");
  const [registerUsername, setRegisterUsername] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const user = userCredential.user;
      await updateProfile(user, { displayName: registerUsername });
    } catch (error) {
      alert("正しく入力してください");
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
          <h1>新規登録</h1>
          <form onSubmit={handleSubmit}>
            <div>
              <label>ユーザー名</label>
              <input
                name="username"
                type="text"
                value={registerUsername}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterUsername(e.target.value)}
              />
            </div>
            <div>
              <label>メールアドレス</label>
              <input
                name="email"
                type="email"
                value={registerEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterEmail(e.target.value)}
              />
            </div>
            <div>
              <label>パスワード</label>
              <input
                name="password"
                type="password"
                value={registerPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterPassword(e.target.value)}
              />
            </div>
            <button>登録する</button>
            <p>ログインは<Link to={`/login/`}>こちら</Link></p>
          </form>
        </>
      )}
    </>
  );
};

export default SignUp;