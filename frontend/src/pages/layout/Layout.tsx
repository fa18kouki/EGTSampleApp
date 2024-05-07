import { Outlet, Link, NavLink } from "react-router-dom";
import styles from "./Layout.module.css";
import Contoso from "../../assets/Contoso.svg";
import { CopyRegular } from "@fluentui/react-icons";
import { Dialog, Stack, TextField } from "@fluentui/react";
import { useContext, useEffect, useState } from "react";
import { HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus, Logout, GetUserInfo} from "../../api";

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
          {/* ここにコードを挿入します 
          <Stack
            horizontal
            verticalAlign="center"
            horizontalAlign="space-between"
          >
            <Stack horizontal verticalAlign="center">
              <img
                src={ui?.logo ? ui.logo : Contoso}
                className={styles.headerIcon}
                aria-hidden="true"
              />
              <Link to="/" className={styles.headerTitleContainer}>
                <h1 className={styles.headerTitle}>{ui?.title}</h1>
              </Link>
            </Stack>
            <Stack
              horizontal
              tokens={{ childrenGap: 4 }}
              className={styles.shareButtonContainer}
            >
              {appStateContext?.state.isCosmosDBAvailable?.status !==
                CosmosDBStatus.NotConfigured && (
                <HistoryButton
                  onClick={handleHistoryClick}
                  text={
                    appStateContext?.state?.isChatHistoryOpen
                      ? hideHistoryLabel
                      : showHistoryLabel
                  }
                />
              )}
              {ui?.show_share_button && (
                <ShareButton onClick={handleShareClick} text={shareLabel} />
              )}
            </Stack>
          </Stack>
          */}
          <div className={styles.headerContainer}>
            <Link to="/" className={styles.headerTitleContainer}>
              <h3 className={styles.headerTitle}>EGT-GPT</h3>
            </Link>
            <nav>
              <ul className={styles.headerNavList}>
                <li className={styles.headerNavRightMargin}>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      isActive
                        ? styles.headerNavPageLinkActive
                        : styles.headerNavPageLink
                    }
                  >
                    企業内向けChat
                  </NavLink>
                </li>
                <li className={styles.headerNavList}>
                  <NavLink
                    to="/unauth_chat"
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
            <div>
              {isAuthenticated ? (
                <div className={styles.dropdown}>
                  <button className={styles.dropbtn}>アカウント</button>
                  <div className={styles.dropdownContent}>
                    <Link to="/my_page">マイページ</Link>
                    <button onClick={handleLogout}>ログアウト</button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className={styles.loginLink}>ログイン</Link>
              )}
            </div>
            <Link to="/user_page" className={styles.headerTitleContainer}>
              <h3 className={styles.headerTitle}>EGT-GPT</h3>
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      {/* 
      <Dialog
        onDismiss={handleSharePanelDismiss}
        hidden={!isSharePanelOpen}
        styles={{
          main: [
            {
              selectors: {
                ["@media (min-width: 480px)"]: {
                  maxWidth: "600px",
                  background: "#FFFFFF",
                  boxShadow:
                    "0px 14px 28.8px rgba(0, 0, 0, 0.24), 0px 0px 8px rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  maxHeight: "200px",
                  minHeight: "100px",
                },
              },
            },
          ],
        }}
        dialogContentProps={{
          title: "Share the web app",
          showCloseButton: true,
        }}
      >
        <Stack horizontal verticalAlign="center" style={{ gap: "8px" }}>
          <TextField
            className={styles.urlTextBox}
            defaultValue={window.location.href}
            readOnly
          />
          <div
            className={styles.copyButtonContainer}
            role="button"
            tabIndex={0}
            aria-label="Copy"
            onClick={handleCopyClick}
            onKeyDown={(e) =>
              e.key === "Enter" || e.key === " " ? handleCopyClick() : null
            }
          >
            <CopyRegular className={styles.copyButton} />
            <span className={styles.copyButtonText}>{copyText}</span>
          </div>
        </Stack>
      </Dialog>
      */}
    </div>
  );
};

export default Layout;
