import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";
import Prompts from "./pages/prompts/Prompts";
import Layout from "./pages/layout/Layout";
import NoPage from "./pages/NoPage";
import Mypage from "./pages/mypage/Mypage";
import UnauthChat from "./pages/unauth_chat/UnauthChat";
import AuthChat from "./pages/auth_chat/AuthChat";
import Login from  "./pages/login/Login";
import SignUp from "./pages/signup/Signup";
import { AppStateProvider } from "./state/AppProvider";

initializeIcons();

export default function App() {
    return (
        <AppStateProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<AuthChat />} />
                        <Route path="login" element={<Login />} />
                        <Route path="chat" element={<UnauthChat />} />
                        <Route path="signup" element={<SignUp/>} />
                        <Route path="prompts" element={<Prompts />} />
                        <Route path="mypage" element={<Mypage />} />
                        <Route path="*" element={<NoPage />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AppStateProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
