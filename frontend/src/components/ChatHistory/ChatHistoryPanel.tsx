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
import { useContext } from "react";
import { AppStateContext } from "../../state/AppProvider";
import React from "react";
import ChatHistoryList from "./ChatHistoryList";
import {
  ChatHistoryLoadingState,
  historyDeleteAll,
  ChatMessage,
  Citation,
} from "../../api";
import { auth } from "../../../FirebaseConfig.js";

interface ChatHistoryPanelProps {
  newChat: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsCitationPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveCitation: React.Dispatch<React.SetStateAction<Citation | undefined>>;
}

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
    {
      key: "addChat",
      text: "新しくチャットを始める",
      iconProps: { iconName: "Add" },
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

  const handleMenuItemClick = (
    ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    item?: IContextualMenuItem
  ) => {
    if (!item) return;
    switch (item.key) {
      case "clearAll":
        toggleClearAllDialog();
        break;
      case "addChat":
        props.newChat();
        break;
      default:
        break;
    }
    onHideContextualMenu();
  };

  React.useEffect(() => {}, [
    appStateContext?.state.chatHistory,
    clearingError,
  ]);

  return (
    <section
      className="max-h-[calc(100vh-100px)] w-[300px] bg-white shadow-lg rounded-lg"
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
            className="self-center font-semibold text-lg mr-auto pl-5"
          >
            {appStateContext?.state.user?.displayName}
          </Text>
        </StackItem>
        <Stack verticalAlign="start">
          <Stack horizontal className="h-[50px]">
            <CommandBarButton
              iconProps={{ iconName: "More" }}
              title={"メニューを表示"}
              onClick={onShowContextualMenu}
              aria-label={"メニューを表示"}
              className="p-0 flex justify-center bg-transparent"
              role="button"
              id="moreButton"
            />
            <ContextualMenu
              items={menuItems}
              hidden={!showContextualMenu}
              target={"#moreButton"}
              onItemClick={handleMenuItemClick}
              onDismiss={onHideContextualMenu}
            />
            <CommandBarButton
              iconProps={{ iconName: "Cancel" }}
              title={"隠す"}
              onClick={handleHistoryClick}
              aria-label={"隠すボタン"}
              className="p-0 flex justify-center bg-transparent"
              role="button"
            />
          </Stack>
        </Stack>
      </Stack>
      <Stack
        aria-label="チャット履歴パネルの内容"
        className="flex flex-col flex-grow pt-0.5 max-w-full"
      >
        <Stack className="overflow-hidden auto max-h-[calc(90vh-105px)]">
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
                    className="w-full mt-2.5"
                  >
                    <StackItem>
                      <Text className="self-center font-normal text-base">
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
                      <Text className="self-center font-normal text-sm">
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
                  className="w-full mt-2.5"
                >
                  <StackItem className="justify-center items-center">
                    <Spinner
                      className="self-start h-full mr-1.25"
                      size={SpinnerSize.medium}
                    />
                  </StackItem>
                  <StackItem>
                    <Text className="self-center font-normal text-sm">
                      <span className="whitespace-pre-wrap">
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
