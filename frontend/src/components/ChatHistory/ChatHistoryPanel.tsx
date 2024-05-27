import {
  CommandBarButton,
  ContextualMenu,
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  ICommandBarStyles,
  IContextualMenuItem,
  IStackStyles,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  Stack,
  StackItem,
  Text,
} from "@fluentui/react";
import { useBoolean } from "@fluentui/react-hooks";
import { Link } from "react-router-dom";
import styles from "./ChatHistoryPanel.module.css";
import { useContext } from "react";
import { AppStateContext } from "../../state/AppProvider";
import React from "react";
import ChatHistoryList from "./ChatHistoryList";
import { ChatHistoryLoadingState, historyDeleteAll } from "../../api";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../../FirebaseConfig.js";

interface ChatHistoryPanelProps {}

export enum ChatHistoryPanelTabs {
  History = "履歴",
}

const commandBarStyle: ICommandBarStyles = {
  root: {
    padding: "0",
    display: "flex",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
};

const commandBarButtonStyle: Partial<IStackStyles> = {
  root: { height: "50px" },
};

export function ChatHistoryPanel(props: ChatHistoryPanelProps) {
  const appStateContext = useContext(AppStateContext);
  const [showContextualMenu, setShowContextualMenu] = React.useState(false);
  const [hideClearAllDialog, { toggle: toggleClearAllDialog }] =
    useBoolean(true);
  const [clearing, setClearing] = React.useState(false);
  const [clearingError, setClearingError] = React.useState(false);

  const clearAllDialogContentProps = {
    type: DialogType.close,
    title: !clearingError
      ? "全てのチャット履歴を削除してもよろしいですか？"
      : "チャット履歴の削除エラー",
    closeButtonAriaLabel: "閉じる",
    subText: !clearingError
      ? "全てのチャット履歴が永久に削除されます。"
      : "もう一度お試しください。問題が解決しない場合は、サイト管理者に連絡してください。",
  };

  const modalProps = {
    titleAriaId: "labelId",
    subtitleAriaId: "subTextId",
    isBlocking: true,
    styles: { main: { maxWidth: 450 } },
  };

  const menuItems: IContextualMenuItem[] = [
    {
      key: "clearAll",
      text: "全てのチャット履歴を削除",
      iconProps: { iconName: "Delete" },
    },
  ];

  const handleHistoryClick = () => {
    appStateContext?.dispatch({ type: "TOGGLE_CHAT_HISTORY" });
  };

  const onShowContextualMenu = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      ev.preventDefault(); // don't navigate
      setShowContextualMenu(true);
    },
    []
  );

  const onHideContextualMenu = React.useCallback(
    () => setShowContextualMenu(false),
    []
  );

  const onClearAllChatHistory = async () => {
    const user = auth.currentUser;
    const idToken = user ? await user.getIdToken() : "";
    setClearing(true);
    let response = await historyDeleteAll(idToken);
    if (!response.ok) {
      setClearingError(true);
    } else {
      appStateContext?.dispatch({ type: "DELETE_CHAT_HISTORY" });
      toggleClearAllDialog();
    }
    setClearing(false);
  };

  const onHideClearAllDialog = () => {
    toggleClearAllDialog();
    setTimeout(() => {
      setClearingError(false);
    }, 2000);
  };

  React.useEffect(() => {}, [
    appStateContext?.state.chatHistory,
    clearingError,
  ]);

  return (
    <section
      className={styles.container}
      data-is-scrollable
      aria-label={"チャット履歴パネル"}
    >
      <Stack
        horizontal
        horizontalAlign="space-between"
        verticalAlign="center"
        wrap
        aria-label="チャット履歴ヘッダー"
      >
        <StackItem>
          <Text
            role="heading"
            aria-level={2}
            style={{
              alignSelf: "center",
              fontWeight: "600",
              fontSize: "18px",
              marginRight: "auto",
              paddingLeft: "20px",
            }}
          >
            {appStateContext?.state.user?.displayName}
          </Text>
        </StackItem>
        {/*
        <StackItem>
          <Text
            role="heading"
            aria-level={2}
            style={{
              alignSelf: "center",
              fontWeight: "600",
              fontSize: "18px",
              marginRight: "auto",
              paddingLeft: "20px",
            }}
          >
            チャット履歴
          </Text>
        </StackItem>
        */}
        <Stack verticalAlign="start">
          <Stack horizontal styles={commandBarButtonStyle}>
            <CommandBarButton
              iconProps={{ iconName: "More" }}
              title={"全てのチャット履歴を削除"}
              onClick={onShowContextualMenu}
              aria-label={"全てのチャット履歴を削除"}
              styles={commandBarStyle}
              role="button"
              id="moreButton"
            />
            <ContextualMenu
              items={menuItems}
              hidden={!showContextualMenu}
              target={"#moreButton"}
              onItemClick={toggleClearAllDialog}
              onDismiss={onHideContextualMenu}
            />
            <CommandBarButton
              iconProps={{ iconName: "Cancel" }}
              title={"隠す"}
              onClick={handleHistoryClick}
              aria-label={"隠すボタン"}
              styles={commandBarStyle}
              role="button"
            />
          </Stack>
        </Stack>
      </Stack>
      <Stack
        aria-label="チャット履歴パネルの内容"
        styles={{
          root: {
            display: "flex",
            flexGrow: 1,
            flexDirection: "column",
            paddingTop: "2.5px",
            maxWidth: "100%",
          },
        }}
        style={{
          display: "flex",
          flexGrow: 1,
          flexDirection: "column",
          flexWrap: "wrap",
          padding: "1px",
        }}
      >
        <Stack className={styles.chatHistoryListContainer}>
          {appStateContext?.state.chatHistoryLoadingState ===
            ChatHistoryLoadingState.Success &&
            appStateContext?.state.isCosmosDBAvailable.cosmosDB && (
              <ChatHistoryList />
            )}
          {appStateContext?.state.chatHistoryLoadingState ===
            ChatHistoryLoadingState.Fail &&
            appStateContext?.state.isCosmosDBAvailable && (
              <>
                <Stack>
                  <Stack
                    horizontalAlign="center"
                    verticalAlign="center"
                    style={{ width: "100%", marginTop: 10 }}
                  >
                    <StackItem>
                      <Text
                        style={{
                          alignSelf: "center",
                          fontWeight: "400",
                          fontSize: 16,
                        }}
                      >
                        {appStateContext?.state.isCosmosDBAvailable?.status && (
                          <span>
                            {appStateContext?.state.isCosmosDBAvailable?.status}
                          </span>
                        )}
                        {!appStateContext?.state.isCosmosDBAvailable
                          ?.status && <span>チャット履歴の読み込みエラー</span>}
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text
                        style={{
                          alignSelf: "center",
                          fontWeight: "400",
                          fontSize: 14,
                        }}
                      >
                        <span>現在、チャット履歴を保存できません</span>
                      </Text>
                    </StackItem>
                  </Stack>
                </Stack>
              </>
            )}
          {appStateContext?.state.chatHistoryLoadingState ===
            ChatHistoryLoadingState.Loading && (
            <>
              <Stack>
                <Stack
                  horizontal
                  horizontalAlign="center"
                  verticalAlign="center"
                  style={{ width: "100%", marginTop: 10 }}
                >
                  <StackItem
                    style={{ justifyContent: "center", alignItems: "center" }}
                  >
                    <Spinner
                      style={{
                        alignSelf: "flex-start",
                        height: "100%",
                        marginRight: "5px",
                      }}
                      size={SpinnerSize.medium}
                    />
                  </StackItem>
                  <StackItem>
                    <Text
                      style={{
                        alignSelf: "center",
                        fontWeight: "400",
                        fontSize: 14,
                      }}
                    >
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        チャット履歴を読み込み中
                      </span>
                    </Text>
                  </StackItem>
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      </Stack>
      <Dialog
        hidden={hideClearAllDialog}
        onDismiss={clearing ? () => {} : onHideClearAllDialog}
        dialogContentProps={clearAllDialogContentProps}
        modalProps={modalProps}
      >
        <DialogFooter>
          {!clearingError && (
            <PrimaryButton
              onClick={onClearAllChatHistory}
              disabled={clearing}
              text="全て削除"
            />
          )}
          <DefaultButton
            onClick={onHideClearAllDialog}
            disabled={clearing}
            text={!clearingError ? "キャンセル" : "閉じる"}
          />
        </DialogFooter>
      </Dialog>
    </section>
  );
}
