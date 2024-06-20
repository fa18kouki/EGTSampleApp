import { Outlet, Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import Contoso from "../../assets/Contoso.svg";
import { CopyRegular } from "@fluentui/react-icons";
import { Dialog, Stack, TextField } from "@fluentui/react";
import React, { useContext, useEffect, useState } from "react";
import { auth } from "../../../FirebaseConfig";
import { HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus, Logout, getUserInfo } from "../../api";
import EGTLogo from "../../assets/EGTLogo.svg";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { NavigationFilled } from '@fluentui/react-icons';
import { UserDropdown } from "../../components/Dropdown/UserDropdown";


const Layout = () => {
  const [isSharePanelOpen, setIsSharePanelOpen] = useState<boolean>(false);
  const [copyClicked, setCopyClicked] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string>("Copy URL");
  const [shareLabel, setShareLabel] = useState<string | undefined>("Share");
  const [hideHistoryLabel, setHideHistoryLabel] =
    useState<string>("Hide chat history");
  const [showHistoryLabel, setShowHistoryLabel] =
    useState<string>("Show chat history");
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleShareClick = () => {
    setIsSharePanelOpen(true);
  };

  const checkAuthentication = async () => {
    const isAuthenticated = await getUserInfo();
    return isAuthenticated ? true : false;
  };

  const handleLogout = () => {
    Logout();
  };

  const handleSharePanelDismiss = () => {
    setIsSharePanelOpen(false);
    setCopyClicked(false);
    setCopyText("Copy URL");
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyClicked(true);
  };

  const handleHistoryClick = () => {
    appStateContext?.dispatch({ type: "TOGGLE_CHAT_HISTORY" });
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await checkAuthentication();
      setIsAuthenticated(authenticated);
    };

    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    checkAuth();
  }, []);

  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/login/");
  };

  useEffect(() => {
    if (copyClicked) {
      setCopyText("Copied URL");
    }
  }, [copyClicked]);

  useEffect(() => {}, [appStateContext?.state.isCosmosDBAvailable.status]);
/*
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) {
        setShareLabel(undefined);
        setHideHistoryLabel("Hide history");
        setShowHistoryLabel("Show history");
      } else {
        setShareLabel("Share");
        setHideHistoryLabel("Hide chat history");
        setShowHistoryLabel("Show chat history");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize); 
  }, []);
*/ 
  return (
    <div className="flex flex-col h-full">
      <header className="bg-gray-900 text-gray-200 h-16 mb-5" role={"banner"}>
        <div className="flex items-center justify-between mx-3 h-full">
          <Link to="/" className="ml-3 font-semibold text-left">
            <img src={EGTLogo} className="h-10" alt="EGT Logo" />
          </Link>
          <nav className="flex-grow">
            <ul className="flex justify-center list-none h-full items-center">
              <li className="ml-5">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive
                      ? "opacity-100 text-gray-200 no-underline"
                      : "opacity-40 text-gray-200 no-underline transition-opacity duration-500 ease-in-out hover:text-white"
                  }
                >
                  チャット
                </NavLink>
              </li>
              <li className="ml-5">
                <NavLink
                  to="/prompts"
                  className={({ isActive }) =>
                    isActive
                      ? "opacity-100 text-gray-200 no-underline"
                      : "opacity-40 text-gray-200 no-underline transition-opacity duration-500 ease-in-out hover:text-white"
                  }
                >
                  プロンプト
                </NavLink>
              </li>
            </ul>
          </nav>
          <div className="mr-3 relative">
            <UserDropdown
              onItemSelect={(item) => {
                if (item.key === "logout") {
                  logout();
                } else if (item.key === "delete-account") {
                  // アカウント削除のロジックをここに追加
                }
              }}
            />
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default Layout;