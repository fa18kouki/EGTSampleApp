import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, Text, IconButton, List, PrimaryButton, Separator, Stack, TextField, ITextField, Spinner, SpinnerSize } from '@fluentui/react';

import { AppStateContext } from '../../state/AppProvider';
import { GroupedChatHistory } from './ChatHistoryList';

import styles from "./ChatHistoryPanel.module.css"
import { useBoolean } from '@fluentui/react-hooks';
import { Conversation } from '../../api/models';
import { historyDelete, historyRename, historyList } from '../../api';
import { useEffect, useRef, useState, useContext } from 'react';

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
    
    const [monthName, yearString] = month.split(' ');
    const year = parseInt(yearString);

    if (year === currentYear) {
        return monthName;
    } else {
        return month;
    }
};

export const ChatHistoryListItemCell: React.FC<ChatHistoryListItemCellProps> = ({
  item,
  onSelect,
}) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [edit, setEdit] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [hideDeleteDialog, { toggle: toggleDeleteDialog }] = useBoolean(true);
    const [errorDelete, setErrorDelete] = useState(false);
    const [renameLoading, setRenameLoading] = useState(false);
    const [errorRename, setErrorRename] = useState<string | undefined>(undefined);
    const [textFieldFocused, setTextFieldFocused] = useState(false);
    const textFieldRef = useRef<ITextField | null>(null);
    
    const appStateContext = React.useContext(AppStateContext)
    const isSelected = item?.id === appStateContext?.state.currentChat?.id;
    const user = appStateContext?.state.user;
    const dialogContentProps = {
        type: DialogType.close,
        title: 'このアイテムを削除してもよろしいですか？',
        closeButtonAriaLabel: '閉じる',
        subText: 'このチャットセッションの履歴は永久に削除されます。',
    };

    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    }

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
            setEditTitle('')
        }
    }, [appStateContext?.state.currentChat?.id, item?.id]);

    const onDelete = async () => {
        let response = await historyDelete(item.id)
        if(!response.ok){
            setErrorDelete(true)
            setTimeout(() => {
                setErrorDelete(false);
            }, 5000);
        }else{
            appStateContext?.dispatch({ type: 'DELETE_CHAT_ENTRY', payload: item.id })
        }
        toggleDeleteDialog();
    };

    const onEdit = () => {
        setEdit(true)
        setTextFieldFocused(true)
        setEditTitle(item?.title)
    };

    const handleSelectItem = () => {
        onSelect(item)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: item } )
    }

    const truncatedTitle = (item?.title?.length > 28) ? `${item.title.substring(0, 28)} ...` : item.title;

    const handleSaveEdit = async (e: any) => {
        e.preventDefault();
        if(errorRename || renameLoading){
            return;
        }
        if(editTitle == item.title){
            setErrorRename("エラー: 新しいタイトルを入力してください。")
            setTimeout(() => {
                setErrorRename(undefined);
                setTextFieldFocused(true);
                if (textFieldRef.current) {
                    textFieldRef.current.focus();
                }
            }, 5000);
            return
        }
        setRenameLoading(true)
        const idToken = await user?.getIdToken();
        let response = await historyRename(item.id, editTitle,idToken);
        if(!response.ok){
            setErrorRename("エラー: アイテムの名前を変更できません")
            setTimeout(() => {
                setTextFieldFocused(true);
                setErrorRename(undefined);
                if (textFieldRef.current) {
                    textFieldRef.current.focus();
                }
            }, 5000);
        }else{
            setRenameLoading(false)
            setEdit(false)
            appStateContext?.dispatch({ type: 'UPDATE_CHAT_TITLE', payload: { ...item, title: editTitle } as Conversation })
            setEditTitle("");
        }
    }

    const chatHistoryTitleOnChange = (e: any) => {
        setEditTitle(e.target.value);
    };

    const cancelEditTitle = () => {
        setEdit(false)
        setEditTitle("");
    }

    const handleKeyPressEdit = (e: any) => {
        if(e.key === "Enter"){
            return handleSaveEdit(e)
        }
        if(e.key === "Escape"){
            cancelEditTitle();
            return
        }
    }

    return (
        <Stack
            key={item.id}
            tabIndex={0}
            aria-label='チャット履歴アイテム'
            className={styles.itemCell}
            onClick={() => handleSelectItem()}
            onKeyDown={e => e.key === "Enter" || e.key === " " ? handleSelectItem() : null}
            verticalAlign='center'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            styles={{
                root: {
                    backgroundColor: isSelected ? '#d1d1d1' : 'transparent',
                }
            }}
        >
            {edit ? <>
                <Stack.Item 
                    style={{ width: '100%' }}
                >
                    <form aria-label='タイトル編集フォーム' onSubmit={(e) => handleSaveEdit(e)} style={{padding: '5px 0px'}}>
                        <Stack horizontal verticalAlign={'start'}>
                            <Stack.Item>
                                <TextField
                                    componentRef={textFieldRef}
                                    autoFocus={textFieldFocused}
                                    value={editTitle}
                                    placeholder={item.title}
                                    onChange={chatHistoryTitleOnChange}
                                    onKeyDown={handleKeyPressEdit}
                                    disabled={errorRename ? true : false}
                                />
                            </Stack.Item>
                            {editTitle && (<Stack.Item>
                                <Stack aria-label='アクションボタングループ' horizontal verticalAlign={'center'}>
                                    <IconButton role='button' disabled={errorRename !== undefined} onKeyDown={e => e.key === " " || e.key === 'Enter' ? handleSaveEdit(e) : null} onClick={(e) => handleSaveEdit(e)} aria-label='新しいタイトルを確認' iconProps={{iconName: 'CheckMark'}} styles={{ root: { color: 'green', marginLeft: '5px' } }} />
                                    <IconButton role='button' disabled={errorRename !== undefined} onKeyDown={e => e.key === " " || e.key === 'Enter' ? cancelEditTitle() : null} onClick={() => cancelEditTitle()} aria-label='タイトル編集をキャンセル' iconProps={{iconName: 'Cancel'}} styles={{ root: { color: 'red', marginLeft: '5px' } }} />
                                </Stack>
                            </Stack.Item>)}
                        </Stack>
                        {errorRename && (
                            <Text role='alert' aria-label={errorRename} style={{fontSize: 12, fontWeight: 400, color: 'rgb(164,38,44)'}}>{errorRename}</Text>
                        )}
                    </form>
                </Stack.Item>
            </> : <>
                <Stack horizontal verticalAlign={'center'} style={{ width: '100%' }}>
                    <div className={styles.chatTitle}>{truncatedTitle}</div>
                    {(isSelected || isHovered) && <Stack horizontal horizontalAlign='end'>
                        <IconButton className={styles.itemButton} iconProps={{ iconName: 'Delete' }} title="削除" onClick={toggleDeleteDialog} onKeyDown={e => e.key === " " ? toggleDeleteDialog() : null}/>
                        <IconButton className={styles.itemButton} iconProps={{ iconName: 'Edit' }} title="編集" onClick={onEdit} onKeyDown={e => e.key === " " ? onEdit() : null}/>
                    </Stack>}
                </Stack>
            </>
            }
            {errorDelete && (
                <Text
                    styles={{
                        root: { color: 'red', marginTop: 5, fontSize: 14 }
                    }}
                >
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
        </Stack>
    );
};

export const ChatHistoryListItemGroups: React.FC<ChatHistoryListItemGroupsProps> = ({ groupedChatHistory }) => {
    const appStateContext = useContext(AppStateContext);
    const observerTarget = useRef(null);
    const [ , setSelectedItem] = React.useState<Conversation | null>(null);
    const [offset, setOffset] = useState<number>(25);
    const [observerCounter, setObserverCounter] = useState(0);
    const [showSpinner, setShowSpinner] = useState(false);
    const firstRender = useRef(true);

  const handleSelectHistory = (item?: Conversation) => {
    if(item){
        setSelectedItem(item)
    }
  }

  const onRenderCell = (item?: Conversation) => {
    return (
      <ChatHistoryListItemCell item={item} onSelect={() => handleSelectHistory(item)} />
    );
  };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        handleFetchHistory();
        setOffset((offset) => offset += 25);
    }, [observerCounter]);

    const handleFetchHistory = async () => {
        const currentChatHistory = appStateContext?.state.chatHistory;
        setShowSpinner(true);
        const user = await appStateContext?.state.user;
        const idToken = await user?.getIdToken();
        await historyList(offset, idToken).then((response) => {
            const concatenatedChatHistory = currentChatHistory && response && currentChatHistory.concat(...response)
            if (response) {
                appStateContext?.dispatch({ type: 'FETCH_CHAT_HISTORY', payload: concatenatedChatHistory || response });
            } else {
                appStateContext?.dispatch({ type: 'FETCH_CHAT_HISTORY', payload: null });
            }
            setShowSpinner(false);
            return response
        })
    }

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) 
                    setObserverCounter((observerCounter) => observerCounter += 1);
            },
            { threshold: 1 }
        );

        if (observerTarget.current) observer.observe(observerTarget.current);

        return () => {
            if (observerTarget.current) observer.unobserve(observerTarget.current);
        };
    }, [observerTarget]);

  return (
    <div className={styles.listContainer} data-is-scrollable>
      {groupedChatHistory.map((group) => (
        group.entries.length > 0 && <Stack horizontalAlign="start" verticalAlign="center" key={group.month} className={styles.chatGroup} aria-label={`チャット履歴グループ: ${group.month}`}>
          <Stack aria-label={group.month} className={styles.chatMonth}>{formatMonth(group.month)}</Stack>
          <List aria-label={`チャット履歴リスト`} items={group.entries} onRenderCell={onRenderCell} className={styles.chatList}/>
          <div ref={observerTarget} />
          <Separator styles={{
            root: {
                width: '100%',
                position: 'relative',
                '::before': {
                  backgroundColor: '#d6d6d6',
                },
              },
          }}/>
        </Stack>
      ))}
      {showSpinner && <div className={styles.spinnerContainer}><Spinner size={SpinnerSize.small} aria-label="さらにチャット履歴を読み込み中" className={styles.spinner}/></div>}
    </div>
  );
};
