import { Outlet, Link, NavLink } from "react-router-dom";
import styles from "./Layout.module.css";
import Contoso from "../../assets/Contoso.svg";
import { CopyRegular } from "@fluentui/react-icons";
import { Dialog, Stack, TextField } from "@fluentui/react";
import { useContext, useEffect, useState } from "react";
import { HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus, Logout, GetUserInfo} from "../../api";
import  EGTLogo from "../../assets/EGTLogo.svg";

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
    const isAuthenticated = await GetUserInfo();
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

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await checkAuthentication();
      setIsAuthenticated(authenticated);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (copyClicked) {
      setCopyText("Copied URL");
    }
  }, [copyClicked]);

  useEffect(() => {}, [appStateContext?.state.isCosmosDBAvailable.status]);

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

  return (
    <div className={styles.layout}>
      <header className={styles.header} role={"banner"}>
        <div className={styles.headerContainer}>
          <div className={styles.headerContainer}>
            <Link to="/" className={styles.headerTitleContainer}>
              <img src={EGTLogo} className={styles.headerLogo} alt="EGT Logo" />
             {/*  <h3 className={styles.headerTitle}>EGT-GPT</h3> */}
            </Link>
            <nav>
              <ul className={styles.headerNavList}>
                <li className={styles.headerNavList}>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      isActive
                        ? styles.headerNavPageLinkActive
                        : styles.headerNavPageLink
                    }
                  >
                    認証不要Chat
                  </NavLink>
                </li>

                <li className={styles.headerNavLeftMargin}>
                  <NavLink
                    to="/prompts"
                    className={({ isActive }) =>
                      isActive
                        ? styles.headerNavPageLinkActive
                        : styles.headerNavPageLink
                    }
                  >
                    プロンプト集
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default Layout;
