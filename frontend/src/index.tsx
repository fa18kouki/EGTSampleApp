import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";
import Prompts from "./pages/prompts/Prompts";
import Layout from "./pages/layout/Layout";
import NoPage from "./pages/NoPage";
import Mypage from "./pages/mypage/Mypage";
import AuthChat from "./pages/auth_chat/AuthChat";
import Login from  "./pages/login/Login";
import Signup from "./pages/signup/Signup";
import Dify from "./components/Dify/Dify";
import Dify2 from "./components/Dify2/Dify2"; 
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
                        <Route path="signup" element={<Signup/>} />
                        <Route path="prompts" element={<Prompts />} />
                        <Route path="mypage" element={<Mypage />} />
                        <Route path="dify" element={<Dify />} />
                        <Route path="dify2" element={<Dify2 />} />
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
