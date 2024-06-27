import React, { useState, useEffect, FormEvent, ChangeEvent,useContext } from "react";
import {
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Login,Signup,getCC,setCC,UpdateUser } from "../../api";
import { AppStateContext } from "../../state/AppProvider";
const SignUp: React.FC = () => {
  const appStateContext = useContext(AppStateContext);
  const user = appStateContext?.state.user;
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [beAdmin, setBeAdmin] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // Signupを使用してユーザーを作成
      const newUser = await Signup(loginEmail, loginPassword);
      if(newUser && typeof newUser === 'object' && 'uid' in newUser){
        await UpdateUser(newUser, username);
        if(beAdmin){
          setCC(newUser.uid, "admin", "true");
        }
      }
      
      setErrorMessage("ユーザーが正常に作成されました");
      navigate("/");
    } catch (error) {
      console.error(error);
      // エラーメッセージを適切に設定
      if (error === "auth/email-already-in-use") {
        setErrorMessage("このメールアドレスは既に使用されています");
      } else if (error === "auth/weak-password") {
        setErrorMessage("パスワードが弱すぎます");
      } else {
        setErrorMessage("ユーザー作成中にエラーが発生しました");
      }
    }
  };

  useEffect(() => {
    const fetchCustomClaims = async () => {
      if (user) {
        try {
          const customClaims = await getCC(user.uid);
          const isAdminClaim = JSON.parse(customClaims).admin;
          setIsAdmin(isAdminClaim === true);
        } catch (error) {
          console.error('カスタムクレームの取得中にエラーが発生しました:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    fetchCustomClaims();
  }, []);

  return (
    <>
      {(user && isAdmin) ? (
        <Navigate to={`/`} />
      ) : (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div className="p-8 rounded-lg shadow-lg bg-white max-w-md w-full">
            <h1 className="text-center mb-4 text-gray-800">ユーザー新規作成ページ</h1>
            <form onSubmit={handleSubmit}>
              <div className="text-red-600">{errorMessage}</div>
              <div className="mb-4">
                <label className="block mb-2 text-gray-600">ユーザー名</label>
                <input
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUsername(e.target.value)
                  }
                  className="w-full p-2 rounded border border-gray-300"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-gray-600">メールアドレス</label>
                <input
                  name="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLoginEmail(e.target.value)
                  }
                  className="w-full p-2 rounded border border-gray-300"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-gray-600">パスワード</label>
                <input
                  name="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLoginPassword(e.target.value)
                  }
                  className="w-full p-2 rounded border border-gray-300"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-gray-600">管理者権限</label>
                <input
                  name="isAdmin"
                  type="checkbox"
                  checked={beAdmin}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setBeAdmin(e.target.checked)
                  }
                />
              </div>
              <button className="w-full p-3 rounded border-none bg-gray-600 text-white text-lg cursor-pointer hover:bg-gray-900">
                ユーザー新規作成
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SignUp;