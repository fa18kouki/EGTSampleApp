import * as React from "react";
import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  Text,
  IconButton,
  List,
  PrimaryButton,
  Separator,
  Stack,
  TextField,
  ITextField,
  Spinner,
  SpinnerSize,
} from "@fluentui/react";

import { AppStateContext } from "../../state/AppProvider";
import { GroupedChatHistory } from "./ChatHistoryList";

import { Conversation } from "../../api/models";
import { historyDelete, historyRename, historyList } from "../../api";
import { useEffect, useRef, useState, useContext } from "react";
import { useBoolean } from "@fluentui/react-hooks";

interface ChatHistoryListItemCellProps {
  item?: Conversation;
  onSelect: (item: Conversation | null) => void;
}

interface ChatHistoryListItemGroupsProps {
  groupedChatHistory: GroupedChatHistory[];
}

const formatMonth = (month: string) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const [monthName, yearString] = month.split(" ");
  const year = parseInt(yearString);

  if (year === currentYear) {
    return monthName;
  } else {
    return month;
  }
};

export const ChatHistoryListItemCell: React.FC<
  ChatHistoryListItemCellProps
> = ({ item, onSelect }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [edit, setEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [hideDeleteDialog, { toggle: toggleDeleteDialog }] = useBoolean(true);
  const [errorDelete, setErrorDelete] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [errorRename, setErrorRename] = useState<string | undefined>(undefined);
  const [textFieldFocused, setTextFieldFocused] = useState(false);
  const textFieldRef = useRef<ITextField | null>(null);

  const appStateContext = React.useContext(AppStateContext);
  const isSelected = item?.id === appStateContext?.state.currentChat?.id;
  const user = appStateContext?.state.user;
  const dialogContentProps = {
    type: DialogType.close,
    title: "このアイテムを削除してもよろしいですか？",
    closeButtonAriaLabel: "閉じる",
    subText: "このチャットセッションの履歴は永久に削除されます。",
  };

  const modalProps = {
    titleAriaId: "labelId",
    subtitleAriaId: "subTextId",
    isBlocking: true,
    styles: { main: { maxWidth: 450 } },
  };

  if (!item) {
    return null;
  }

  useEffect(() => {
    if (textFieldFocused && textFieldRef.current) {
      textFieldRef.current.focus();
      setTextFieldFocused(false);
    }
  }, [textFieldFocused]);

  useEffect(() => {
    if (appStateContext?.state.currentChat?.id !== item?.id) {
      setEdit(false);
      setEditTitle("");
    }
  }, [appStateContext?.state.currentChat?.id, item?.id]);

  const onDelete = async () => {
    const idToken = user ? await user.getIdToken() : "";
    let response = await historyDelete(item.id, idToken);
    if (!response.ok) {
      setErrorDelete(true);
      setTimeout(() => {
        setErrorDelete(false);
      }, 5000);
    } else {
      appStateContext?.dispatch({
        type: "DELETE_CHAT_ENTRY",
        payload: item.id,
      });
    }
    toggleDeleteDialog();
  };

  const onEdit = () => {
    setEdit(true);
    setTextFieldFocused(true);
    setEditTitle(item?.title);
  };

  const handleSelectItem = () => {
    onSelect(item);
    appStateContext?.dispatch({ type: "UPDATE_CURRENT_CHAT", payload: item });
  };

  const truncatedTitle =
    item?.title?.length > 28
      ? `${item.title.substring(0, 28)} ...`
      : item.title;

  const handleSaveEdit = async (e: any) => {
    e.preventDefault();
    if (errorRename || renameLoading) {
      return;
    }
    if (editTitle == item.title) {
      setErrorRename("エラー: 新しいタイトルを入力してください。");
      setTimeout(() => {
        setErrorRename(undefined);
        setTextFieldFocused(true);
        if (textFieldRef.current) {
          textFieldRef.current.focus();
        }
      }, 5000);
      return;
    }
    setRenameLoading(true);
    const idToken = await user?.getIdToken();
    let response = await historyRename(item.id, editTitle, idToken);
    if (!response.ok) {
      setErrorRename("エラー: アイテムの名前を変更できません");
      setTimeout(() => {
        setTextFieldFocused(true);
        setErrorRename(undefined);
        if (textFieldRef.current) {
          textFieldRef.current.focus();
        }
      }, 5000);
    } else {
      setRenameLoading(false);
      setEdit(false);
      appStateContext?.dispatch({
        type: "UPDATE_CHAT_TITLE",
        payload: { ...item, title: editTitle } as Conversation,
      });
      setEditTitle("");
    }
  };

  const chatHistoryTitleOnChange = (e: any) => {
    setEditTitle(e.target.value);
  };

  const cancelEditTitle = () => {
    setEdit(false);
    setEditTitle("");
  };

  const handleKeyPressEdit = (e: any) => {
    if (e.key === "Enter") {
      return handleSaveEdit(e);
    }
    if (e.key === "Escape") {
      cancelEditTitle();
      return;
    }
  };

  return (
    <div
      key={item.id}
      tabIndex={0}
      aria-label="チャット履歴アイテム"
      className={`cursor-pointer px-4 py-2 box-border rounded-md flex ${
        isSelected || isHovered ? "h-[50px]" : "h-[32px]"
      } ${isSelected ? "bg-gray-300" : "bg-transparent"} ${
        isHovered ? "bg-gray-200" : "bg-transparent"
      }`}
      onClick={() => handleSelectItem()}
      onKeyDown={(e) =>
        e.key === "Enter" || e.key === " " ? handleSelectItem() : null
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {edit ? (
        <div className="w-full">
          <form
            aria-label="タイトル編集フォーム"
            onSubmit={(e) => handleSaveEdit(e)}
            className="py-1"
          >
            <div className="flex items-start">
              <div>
                <TextField
                  className="w-full h-[50px]"
                  componentRef={textFieldRef}
                  autoFocus={textFieldFocused}
                  value={editTitle}
                  placeholder={item.title}
                  onChange={chatHistoryTitleOnChange}
                  onKeyDown={handleKeyPressEdit}
                  disabled={errorRename ? true : false}
                />
              </div>
              {editTitle && (
                <div className="flex items-center">
                  <IconButton
                    role="button"
                    disabled={errorRename !== undefined}
                    onKeyDown={(e) =>
                      e.key === " " || e.key === "Enter"
                        ? handleSaveEdit(e)
                        : null
                    }
                    onClick={(e) => handleSaveEdit(e)}
                    aria-label="新しいタイトルを確認"
                    iconProps={{ iconName: "CheckMark" }}
                    className="text-green-500 ml-1"
                  />
                  <IconButton
                    role="button"
                    disabled={errorRename !== undefined}
                    onKeyDown={(e) =>
                      e.key === " " || e.key === "Enter"
                        ? cancelEditTitle()
                        : null
                    }
                    onClick={() => cancelEditTitle()}
                    aria-label="タイトル編集をキャンセル"
                    iconProps={{ iconName: "Cancel" }}
                    className="text-red-500 ml-1"
                  />
                </div>
              )}
            </div>
            {errorRename && (
              <Text
                role="alert"
                aria-label={errorRename}
                className="text-xs font-normal text-red-600"
              >
                {errorRename}
              </Text>
            )}
          </form>
        </div>
      ) : (
        <div className="flex items-center w-full">
          <div className="w-4/5 overflow-hidden whitespace-nowrap text-ellipsis">
            {truncatedTitle}
          </div>
          {(isSelected || isHovered) && (
            <div className="flex justify-end">
              <IconButton
                className="flex justify-center items-center w-7 h-7 border border-gray-300 rounded-md bg-white text-black-500 mx-1 cursor-pointer hover:bg-gray-200"
                iconProps={{ iconName: "Delete" }}
                title="削除"
                onClick={toggleDeleteDialog}
                onKeyDown={(e) => (e.key === " " ? toggleDeleteDialog() : null)}
              />
              <IconButton
                className="flex justify-center items-center w-7 h-7 border border-gray-300 rounded-md bg-white text-black-500 mx-1 cursor-pointer hover:bg-gray-200"
                iconProps={{ iconName: "Edit" }}
                title="編集"
                onClick={onEdit}
                onKeyDown={(e) => (e.key === " " ? onEdit() : null)}
              />
            </div>
          )}
        </div>
      )}
      {errorDelete && (
        <Text className="text-red-600 mt-1 text-sm">
          エラー: アイテムを削除できません
        </Text>
      )}
      <Dialog
        hidden={hideDeleteDialog}
        onDismiss={toggleDeleteDialog}
        dialogContentProps={dialogContentProps}
        modalProps={modalProps}
      >
        <DialogFooter>
          <PrimaryButton onClick={onDelete} text="削除" />
          <DefaultButton onClick={toggleDeleteDialog} text="キャンセル" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export const ChatHistoryListItemGroups: React.FC<
  ChatHistoryListItemGroupsProps
> = ({ groupedChatHistory }) => {
  const appStateContext = useContext(AppStateContext);
  const observerTarget = useRef(null);
  const [, setSelectedItem] = React.useState<Conversation | null>(null);
  const [offset, setOffset] = useState<number>(25);
  const [observerCounter, setObserverCounter] = useState(0);
  const [showSpinner, setShowSpinner] = useState(false);
  const firstRender = useRef(true);

  const handleSelectHistory = (item?: Conversation) => {
    if (item) {
      setSelectedItem(item);
    }
  };

  const onRenderCell = (item?: Conversation) => {
    return (
      <ChatHistoryListItemCell
        item={item}
        onSelect={() => handleSelectHistory(item)}
      />
    );
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    handleFetchHistory();
    setOffset((offset) => (offset += 25));
  }, [observerCounter]);

  const handleFetchHistory = async () => {
    const currentChatHistory = appStateContext?.state.chatHistory;
    setShowSpinner(true);
    const user = await appStateContext?.state.user;
    const idToken = await user?.getIdToken();
    await historyList(offset, idToken).then((response) => {
      const concatenatedChatHistory =
        currentChatHistory &&
        response &&
        currentChatHistory.concat(...response);
      if (response) {
        appStateContext?.dispatch({
          type: "FETCH_CHAT_HISTORY",
          payload: concatenatedChatHistory || response,
        });
      } else {
        appStateContext?.dispatch({
          type: "FETCH_CHAT_HISTORY",
          payload: null,
        });
      }
      setShowSpinner(false);
      return response;
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setObserverCounter((observerCounter) => (observerCounter += 1));
      },
      { threshold: 1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [observerTarget]);

  return (
    <div
      className="overflow-hidden overflow-y-auto max-h-[calc(90vh-105px)]"
      data-is-scrollable
    >
      {groupedChatHistory.map(
        (group) =>
          group.entries.length > 0 && (
            <div
              className="my-1 w-full"
              key={group.month}
              aria-label={`チャット履歴グループ: ${group.month}`}
            >
              <div
                aria-label={group.month}
                className="text-sm font-semibold mb-1 pl-4"
              >
                {formatMonth(group.month)}
              </div>
              <List
                aria-label={`チャット履歴リスト`}
                items={group.entries}
                onRenderCell={onRenderCell}
                className="w-full"
              />
              <div ref={observerTarget} />
              <hr className="w-full relative border-t border-gray-300" />
            </div>
          )
      )}
      {showSpinner && (
        <div className="flex justify-center items-center h-12">
          <Spinner
            size={SpinnerSize.small}
            aria-label="さらにチャット履歴を読み込み中"
            className=""
          />
        </div>
      )}
    </div>
  );
};
