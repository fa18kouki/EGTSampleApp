import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link } from "react-router-dom";

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
        <div className="flex justify-center items-center h-screen bg-[#F7F7F7]">
          <form
            onSubmit={handleSubmit}
            className="bg-[#FFFFFF] p-10 rounded-lg shadow-xl w-full max-w-sm border-2 border-[#CFCFCF]"
          >
            <h2 className="text-2xl font-roboto mb-6 text-center text-[#121212]">
              ログイン
            </h2>
            <div className="text-red-600">{errorMessage}</div>
            <div className="mb-4">
              <label
                htmlFor="company"
                className="block text-[#4A4A4A] font-roboto mb-2"
              >
                会社名
              </label>
              <input
                type="text"
                name="company"
                id="company"
                value={company}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCompany(e.target.value)
                }
                className="bg-gray-50 border border-[#D6D6D6] rounded py-2 px-4 block w-full"
                placeholder="会社名を入力"
              />
            </div>
            <div className="text-red-600">{emailErrorMessage}</div>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-[#4A4A4A] font-roboto mb-2"
              >
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={loginEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLoginEmail(e.target.value)
                }
                className="bg-gray-50 border border-[#D6D6D6] rounded py-2 px-4 block w-full"
                placeholder="メールアドレスを入力"
              />
            </div>
            <div className="text-red-600">{passwordErrorMessage}</div>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-[#4A4A4A] font-roboto mb-2"
              >
                パスワード
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={loginPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLoginPassword(e.target.value)
                }
                className="bg-gray-50 border border-[#D6D6D6] rounded py-2 px-4 block w-full"
                placeholder="パスワードを入力"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#121212] text-white font-roboto rounded py-3 px-4 hover:bg-[#363636]"
            >
              ログイン
            </button>
            <p className="text-center mt-4 text-[#4A4A4A] font-roboto">
              新規登録は
              <Link to={`/signup/`} className="text-[#121212] hover:underline">
                こちら
              </Link>
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default Login;