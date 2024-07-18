import { Outlet, Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import Contoso from "../../assets/Contoso.svg";
import { CopyRegular } from "@fluentui/react-icons";
import { Dialog, Stack, TextField } from "@fluentui/react";
import React, { useContext, useEffect, useState } from "react";
import { auth } from "../../../FirebaseConfig";
import { HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus, Logout, getCC } from "../../api";
import EGTLogo from "../../assets/EGTLogo.svg";
import { NavigationFilled,FolderPeople24Filled,FolderPeople24Regular } from '@fluentui/react-icons';
import { UserDropdown } from "../../components/Dropdown/UserDropdown";
import { Menu, MenuTrigger, MenuList, MenuItem, MenuPopover } from "@fluentui/react-components";
import { SettingsRegular, SignOutRegular } from "@fluentui/react-icons";
import { UserListDialog } from "../../components/Users/Users";

const Layout = () => {
  const [copyClicked, setCopyClicked] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string>("Copy URL");
  const [shareLabel, setShareLabel] = useState<string | undefined>("Share");
  const [hideHistoryLabel, setHideHistoryLabel] =
    useState<string>("Hide chat history");
  const [showHistoryLabel, setShowHistoryLabel] =
    useState<string>("Show chat history");
  const [showUserList, setShowUserList] = useState<boolean>(false);
  const appStateContext = useContext(AppStateContext);
  const user = appStateContext?.state.user;
  const navigate = useNavigate();
  const logout = async () => {
    await Logout();
    navigate("/login/");
  };

  useEffect(() => {
    const fetchCustomClaims = async () => {
      console.log(user);
      if(user){
        const customClaims = await getCC(user.uid);
        console.log(customClaims);
        const isAdminClaim = JSON.parse(customClaims).claims.admin;
        console.log(isAdminClaim);
        setIsAdmin(isAdminClaim);
      }
    };
    fetchCustomClaims();
  }, []);
  return (
    <div className="flex flex-col h-full">
      <header className="bg-gray-900 text-gray-200 h-16 mb-5 px-4" role={"banner"}>
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
              <li className="ml-5">
                <NavLink
                  to="/dify"
                  className={({ isActive }) =>
                    isActive
                      ? "opacity-100 text-gray-200 no-underline"
                      : "opacity-40 text-gray-200 no-underline transition-opacity duration-500 ease-in-out hover:text-white"
                  }
                >
                  カスタマイズチャット
                </NavLink>
              </li>
              <li className="ml-5">
                <NavLink
                  to="/dify2"
                  className={({ isActive }) =>
                    isActive
                      ? "opacity-100 text-gray-200 no-underline"
                      : "opacity-40 text-gray-200 no-underline transition-opacity duration-500 ease-in-out hover:text-white"
                  }
                >
                  Gemini
                </NavLink>
              </li>
            </ul>
          </nav>
          <div className="mr-3 relative">
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <button className="text-white hover:text-gray-300">
                  {user?.displayName || 'ログイン'}
                </button>
              </MenuTrigger>

              <MenuPopover>
                <MenuList>
                  {isAdmin && (
                   <MenuItem icon={<FolderPeople24Filled />} onClick={() => appStateContext?.dispatch({ type: 'TOGGLE_USERS_PANEL' })}>
                    ユーザー管理
                  </MenuItem>
                  )}
                  {/*
                  <MenuItem icon={<SettingsRegular />} onClick={() => navigate("/settings")}>
                    設定
                  </MenuItem>
                  */}
                  <MenuItem icon={<SignOutRegular />} onClick={logout}>
                    ログアウト
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default Layout;