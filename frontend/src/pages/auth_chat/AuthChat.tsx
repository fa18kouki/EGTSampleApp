import {
  useRef,
  useState,
  useEffect,
  useContext,
  useLayoutEffect,
} from "react";
import {
  CommandBarButton,
  IconButton,
  Dialog,
  DialogType,
  Stack,
  Panel,
  DefaultButton,
  Spinner,
} from "@fluentui/react";
import {
  SquareRegular,
  ShieldLockRegular,
  ErrorCircleRegular,
  PanelLeftTextRegular,
  PanelLeftRegular,
  ChevronDoubleDownFilled,
} from "@fluentui/react-icons";
import {
  //Dropdown,
  makeStyles,
  Option,
  useId,
  Persona,
  Button,
} from "@fluentui/react-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import uuid from "react-uuid";
import { isEmpty } from "lodash-es";
import DOMPurify from "dompurify";
import styles from "./AuthChat.module.css";
import EGTLogo from "../../assets/EGTLogo.svg";
import { XSSAllowTags } from "../../constants/xssAllowTags";
import { HistoryButton } from "../../components/common/Button";
import {
  ChatMessage,
  ConversationRequest,
  conversationApi,
  Citation,
  ToolMessageContent,
  ChatResponse,
  getUserInfo,
  Conversation,
  historyGenerate,
  historyUpdate,
  historyClear,
  ChatHistoryLoadingState,
  CosmosDBStatus,
  ErrorMessage,
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import { UserListDialog } from "../../components/Users/Users";
import { LLMDropdown, UserDropdown } from "../../components/Dropdown";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";
import { SettingsButton } from "../../components/SettingsButton";
import fv_text1_black from "../../assets/fv_text1_black.png";
import fv_text2_black from "../../assets/fv_text2_black.png";
import fv_text3_black from "../../assets/fv_text3_black.png";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { useNavigate, Navigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
const enum messageStatus {
  NotRunning = "Not Running",
  Processing = "Processing",
  Done = "Done",
}

const ExamplePrompts = [
  "プロンプト1",
  "プロンプト2",
  "プロンプト3",
];

const AuthChat = () => {
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled;
  const user = appStateContext?.state.user;
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<Citation>();
  const [isCitationPanelOpen, setIsCitationPanelOpen] =
    useState<boolean>(false);
  const abortFuncs = useRef([] as AbortController[]);
  //const [showAuthMessage, setShowAuthMessage] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processMessages, setProcessMessages] = useState<messageStatus>(
    messageStatus.NotRunning
  );
  const [clearingChat, setClearingChat] = useState<boolean>(false);
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>();
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [gptModel, setGptModel] = useState<string>("gpt4-o");
  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: "Close",
    subText: errorMsg?.subtitle,
  };
  interface Item {
    name: string;
    description: string;
    key: string;
  }
  const onItemSelect = (item: Item) => {
    setGptModel(item.key as string);
    console.log("Selected item: ", item.key);
  };
  /*
  const onGptModelChange = (
    _ev?: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    if (option !== undefined) {
      setGptModel(option.key as string);
    }
  };
  */
  const modalProps = {
    titleAriaId: "labelId",
    subtitleAriaId: "subTextId",
    isBlocking: true,
    styles: { main: { maxWidth: 450 } },
  };
  const [ASSISTANT, TOOL, ERROR] = ["assistant", "tool", "error"];
  const NO_CONTENT_ERROR = "No content in messages object.";

  const handleHistoryClick = () => {
    appStateContext?.dispatch({ type: "TOGGLE_CHAT_HISTORY" });
  };

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !==
        CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !==
        CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`;
      setErrorMsg({
        title: "Chat history is not enabled",
        subtitle: subtitle,
      });
      toggleErrorDialog();
    }
  }, [appStateContext?.state.isCosmosDBAvailable]);

  const handleErrorDialogClose = () => {
    toggleErrorDialog();
    setTimeout(() => {
      setErrorMsg(null);
    }, 500);
  };

  useEffect(() => {
    setIsLoading(
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Loading
    );
  }, [appStateContext?.state.chatHistoryLoadingState]);
  /*
  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) {
      setShowAuthMessage(false);
      return;
    }
    const userInfoList = await getUserInfo();
    if (userInfoList.length === 0 && window.location.hostname !== "127.0.0.1") {
      setShowAuthMessage(true);
    } else {
      setShowAuthMessage(false);
    }
  };
  */

  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/login/");
  };

  let assistantMessage = {} as ChatMessage;
  let toolMessage = {} as ChatMessage;
  let assistantContent = "";

  const processResultMessage = (
    resultMessage: ChatMessage,
    userMessage: ChatMessage,
    conversationId?: string
  ) => {
    if (resultMessage.role === ASSISTANT) {
      assistantContent += resultMessage.content;
      assistantMessage = resultMessage;
      assistantMessage.content = assistantContent;

      if (resultMessage.context) {
        toolMessage = {
          id: uuid(),
          role: TOOL,
          content: resultMessage.context,
          date: new Date().toISOString(),
        };
      }
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage;

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([
            ...messages,
            userMessage,
            toolMessage,
            assistantMessage,
          ]);
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage]);
    }
  };

  const makeApiRequestWithoutCosmosDB = async (
    question: string,
    file?: null | File[],
    conversationId?: string
  ) => {
    setIsLoading(true);
    setShowLoadingMessage(true);
    const abortController = new AbortController();
    abortFuncs.current.unshift(abortController);

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: question,
      gptmodel: gptModel,
      date: new Date().toISOString(),
    };

    let conversation: Conversation | null | undefined;
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString(),
      };
    } else {
      conversation = appStateContext?.state?.currentChat;
      if (!conversation) {
        console.error("Conversation not found.");
        setIsLoading(false);
        setShowLoadingMessage(false);
        abortFuncs.current = abortFuncs.current.filter(
          (a) => a !== abortController
        );
        return;
      } else {
        conversation.messages.push(userMessage);
      }
    }

    appStateContext?.dispatch({
      type: "UPDATE_CURRENT_CHAT",
      payload: conversation,
    });
    setMessages(conversation.messages);

    const request: ConversationRequest = {
      messages: [
        ...conversation.messages.filter((answer) => answer.role !== ERROR),
      ],
      gptModel: gptModel,
    };

    let result = {} as ChatResponse;
    try {
      const response = await conversationApi(request, abortController.signal);
      if (response?.body) {
        const reader = response.body.getReader();

        let runningText = "";
        while (true) {
          setProcessMessages(messageStatus.Processing);
          const { done, value } = await reader.read();
          if (done) break;

          var text = new TextDecoder("utf-8").decode(value);
          const objects = text.split("\n");
          objects.forEach((obj) => {
            try {
              if (obj !== "" && obj !== "{}") {
                runningText += obj;
                result = JSON.parse(runningText);
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach((msg) => {
                    msg.id = result.id;
                    msg.date = new Date().toISOString();
                  });
                  if (
                    result.choices[0].messages?.some(
                      (m) => m.role === ASSISTANT
                    )
                  ) {
                    setShowLoadingMessage(false);
                  }
                  result.choices[0].messages.forEach((resultObj) => {
                    processResultMessage(
                      resultObj,
                      userMessage,
                      conversationId
                    );
                  });
                } else if (result.error) {
                  throw Error(result.error);
                }
                runningText = "";
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e);
                throw e;
              } else {
                console.log("Incomplete message. Continuing...");
              }
            }
          });
        }
        conversation.messages.push(toolMessage, assistantMessage);
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: conversation,
        });
        setMessages([...messages, toolMessage, assistantMessage]);
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          "An error occurred. Please try again. If the problem persists, please contact the site administrator.";
        if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (typeof result.error === "string") {
          errorMessage = result.error;
        }
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString(),
        };
        conversation.messages.push(errorChatMsg);
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: conversation,
        });
        setMessages([...messages, errorChatMsg]);
      } else {
        setMessages([...messages, userMessage]);
      }
    } finally {
      setIsLoading(false);
      setShowLoadingMessage(false);
      abortFuncs.current = abortFuncs.current.filter(
        (a) => a !== abortController
      );
      setProcessMessages(messageStatus.Done);
    }

    return abortController.abort();
  };

  const makeApiRequestWithCosmosDB = async (
    question: string,
    file?: null | File[],
    conversationId?: string
  ) => {
    setIsLoading(true);
    setShowLoadingMessage(true);
    const abortController = new AbortController();
    abortFuncs.current.unshift(abortController);

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: question,
      date: new Date().toISOString(),
    };

    //api call params set here (generate)
    let request: ConversationRequest;
    let conversation;
    if (conversationId) {
      conversation = appStateContext?.state?.chatHistory?.find(
        (conv) => conv.id === conversationId
      );
      if (!conversation) {
        console.error("Conversation not found.");
        setIsLoading(false);
        setShowLoadingMessage(false);
        abortFuncs.current = abortFuncs.current.filter(
          (a) => a !== abortController
        );
        return;
      } else {
        conversation.messages.push(userMessage);
        request = {
          messages: [
            ...conversation.messages.filter((answer) => answer.role !== ERROR),
          ],
          gptModel: gptModel,
          file: file ? file : undefined,
        };
      }
    } else {
      request = {
        messages: [userMessage].filter((answer) => answer.role !== ERROR),
        gptModel: gptModel,
        file: file ? file : undefined,
      };
      setMessages(request.messages);
    }
    let result = {} as ChatResponse;
    try {
      const idToken = user ? await user.getIdToken() : "";
      const response = conversationId
        ? await historyGenerate(
            request,
            abortController.signal,
            idToken,
            conversationId
          )
        : await historyGenerate(request, abortController.signal, idToken);

      if (!response?.ok) {
        const responseJson = await response.json();
        var errorResponseMessage =
          responseJson.error === undefined
            ? "もう一度お試しください。問題が解決しない場合は、サイト管理者に連絡してください。"
            : responseJson.error;
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `応答の生成中に���ラーが発生しました。チャット履歴を保存できません。${errorResponseMessage}`,
          date: new Date().toISOString(),
        };
        let resultConversation;
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(
            (conv) => conv.id === conversationId
          );
          if (!resultConversation) {
            console.error("Conversation not found.");
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation.messages.push(errorChatMsg);
        } else {
          setMessages([...messages, userMessage, errorChatMsg]);
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        setMessages([...resultConversation.messages]);
        return;
      }
      if (response?.body) {
        const reader = response.body.getReader();

        let runningText = "";
        while (true) {
          setProcessMessages(messageStatus.Processing);
          const { done, value } = await reader.read();
          if (done) break;

          var text = new TextDecoder("utf-8").decode(value);
          const objects = text.split("\n");
          objects.forEach((obj) => {
            try {
              if (obj !== "" && obj !== "{}") {
                runningText += obj;
                result = JSON.parse(runningText);
                if (!result.choices?.[0]?.messages?.[0].content) {
                  errorResponseMessage = NO_CONTENT_ERROR;
                  throw Error();
                }
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach((msg) => {
                    msg.id = result.id;
                    msg.date = new Date().toISOString();
                  });
                  if (
                    result.choices[0].messages?.some(
                      (m) => m.role === ASSISTANT
                    )
                  ) {
                    setShowLoadingMessage(false);
                  }
                  result.choices[0].messages.forEach((resultObj) => {
                    processResultMessage(
                      resultObj,
                      userMessage,
                      conversationId
                    );
                  });
                }
                runningText = "";
              } else if (result.error) {
                throw Error(result.error);
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e);
                throw e;
              } else {
                console.log("Incomplete message. Continuing...");
              }
            }
          });
        }

        let resultConversation;
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(
            (conv) => conv.id === conversationId
          );
          if (!resultConversation) {
            console.error("Conversation not found.");
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage);
        } else {
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date,
          };
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage);
        }
        if (!resultConversation) {
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        isEmpty(toolMessage)
          ? setMessages([...messages, assistantMessage])
          : setMessages([...messages, toolMessage, assistantMessage]);
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage = `An error occurred. ${errorResponseMessage}`;
        console.error(e);
        if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (typeof result.error === "string") {
          errorMessage = result.error;
        }
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString(),
        };
        let resultConversation;
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(
            (conv) => conv.id === conversationId
          );
          if (!resultConversation) {
            console.error("Conversation not found.");
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation.messages.push(errorChatMsg);
        } else {
          if (!result.history_metadata) {
            console.error("Error retrieving data.", result);
            let errorChatMsg: ChatMessage = {
              id: uuid(),
              role: ERROR,
              content: errorMessage,
              date: new Date().toISOString(),
            };
            setMessages([...messages, userMessage, errorChatMsg]);
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(
              (a) => a !== abortController
            );
            return;
          }
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date,
          };
          resultConversation.messages.push(errorChatMsg);
        }
        if (!resultConversation) {
          setIsLoading(false);
          setShowLoadingMessage(false);
          abortFuncs.current = abortFuncs.current.filter(
            (a) => a !== abortController
          );
          return;
        }
        appStateContext?.dispatch({
          type: "UPDATE_CURRENT_CHAT",
          payload: resultConversation,
        });
        setMessages([...messages, errorChatMsg]);
      } else {
        setMessages([...messages, userMessage]);
      }
    } finally {
      setIsLoading(false);
      setShowLoadingMessage(false);
      abortFuncs.current = abortFuncs.current.filter(
        (a) => a !== abortController
      );
      setProcessMessages(messageStatus.Done);
    }
    return abortController.abort();
  };

  const clearChat = async () => {
    setClearingChat(true);
    if (
      appStateContext?.state.currentChat?.id &&
      appStateContext?.state.isCosmosDBAvailable.cosmosDB
    ) {
      const idToken = user ? await user.getIdToken() : "";
      let response = await historyClear(
        appStateContext?.state.currentChat.id,
        idToken
      );
      if (!response.ok) {
        setErrorMsg({
          title: "Error clearing current chat",
          subtitle:
            "Please try again. If the problem persists, please contact the site administrator.",
        });
        toggleErrorDialog();
      } else {
        appStateContext?.dispatch({
          type: "DELETE_CURRENT_CHAT_MESSAGES",
          payload: appStateContext?.state.currentChat.id,
        });
        appStateContext?.dispatch({
          type: "UPDATE_CHAT_HISTORY",
          payload: appStateContext?.state.currentChat,
        });
        setActiveCitation(undefined);
        setIsCitationPanelOpen(false);
        setMessages([]);
      }
    }
    setClearingChat(false);
  };

  const newChat = () => {
    setProcessMessages(messageStatus.Processing);
    setMessages([]);
    setIsCitationPanelOpen(false);
    setActiveCitation(undefined);
    appStateContext?.dispatch({ type: "UPDATE_CURRENT_CHAT", payload: null });
    setProcessMessages(messageStatus.Done);
  };

  const stopGenerating = () => {
    abortFuncs.current.forEach((a) => a.abort());
    setShowLoadingMessage(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      setMessages(appStateContext.state.currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [appStateContext?.state.currentChat]);

  useLayoutEffect(() => {
    const saveToDB = async (messages: ChatMessage[], id: string) => {
      const idToken = user ? await user.getIdToken() : "";
      const response = await historyUpdate(messages, id, idToken);
      return response;
    };

    if (
      appStateContext &&
      appStateContext.state.currentChat &&
      processMessages === messageStatus.Done
    ) {
      if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
        if (!appStateContext?.state.currentChat?.messages) {
          console.error("Failure fetching current chat state.");
          return;
        }
        // ここでエラーメッセージのフィルタリングを行わず、全メッセージを保存
        saveToDB(
          appStateContext.state.currentChat.messages,
          appStateContext.state.currentChat.id
        )
          .then((res) => {
            if (!res.ok) {
              let errorMessage =
                "エラーが発生しました。回答を保存できませんでした。問題が解決しない場合は、サイト管理者に連絡してください。";
              let errorChatMsg: ChatMessage = {
                id: uuid(),
                role: ERROR,
                content: errorMessage,
                date: new Date().toISOString(),
              };
              setMessages([
                ...(appStateContext?.state.currentChat?.messages || []),
                errorChatMsg,
              ]);
            }
            return res as Response;
          })
          .catch((err) => {
            console.error("Error: ", err);
          });
      }
      appStateContext?.dispatch({
        type: "UPDATE_CHAT_HISTORY",
        payload: appStateContext.state.currentChat,
      });
      setMessages(appStateContext.state.currentChat.messages);
      setProcessMessages(messageStatus.NotRunning);
    }
  }, [processMessages]);
  /*
  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList();
  }, [AUTH_ENABLED]);
  */
  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [showLoadingMessage, processMessages]);

  const onShowCitation = (citation: Citation) => {
    setActiveCitation(citation);
    setIsCitationPanelOpen(true);
  };

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes("blob.core")) {
      window.open(citation.url, "_blank");
    }
  };

  const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === "tool") {
      try {
        const toolMessage = JSON.parse(message.content) as ToolMessageContent;
        return toolMessage.citations;
      } catch {
        return [];
      }
    }
    return [];
  };

  const disabledButton = () => {
    return (
      isLoading ||
      (messages && messages.length === 0) ||
      clearingChat ||
      appStateContext?.state.chatHistoryLoadingState ===
        ChatHistoryLoadingState.Loading
    );
  };

  const handlePromptClick = (prompt: string) => {
    // 入力部分にプロンプトを設定するロジック
    const inputElement = document.getElementById("questionInput") as HTMLInputElement;
    if (inputElement) {
      inputElement.value = prompt;
    }
  };

  return (
    <>
      {user ? (
        <div className="flex flex-col gap-5 flex-1" role="main">
          <Stack horizontal className="flex flex-1 mt-0 mb-5 mx-5 gap-1">
            {appStateContext?.state.isChatHistoryOpen &&
              appStateContext?.state.isCosmosDBAvailable?.status !==
                CosmosDBStatus.NotConfigured && (
                <ChatHistoryPanel
                  newChat={newChat}
                  setMessages={setMessages}
                  setIsCitationPanelOpen={setIsCitationPanelOpen}
                  setActiveCitation={setActiveCitation}
                />
              )}
            {appStateContext?.state.isUsersPanelOpen && (
              <UserListDialog />
            )}
            <div className="flex flex-col items-center flex-1 bg-gradient-to-b from-white to-gray-400 shadow-md rounded-lg overflow-y-auto max-h-[calc(100vh-100px)]">
              <div className="flex justify-end items-start">
                <Stack horizontal horizontalAlign="space-between">
                  <Stack horizontal>
                    {appStateContext?.state.isCosmosDBAvailable?.status !==
                      CosmosDBStatus.NotConfigured && (
                      <>
                        {appStateContext?.state.isChatHistoryOpen ? (
                          <Button
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f0f0f0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                            onClick={handleHistoryClick}
                            style={{
                              transition: "background-color 0.3s ease",
                              borderRadius: "8px",
                              padding: "4px",
                            }}
                          >
                            <PanelLeftRegular className="w-10 h-9 text-gray-700 float-right" />
                          </Button>
                        ) : (
                          <Button
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f0f0f0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                            onClick={handleHistoryClick}
                            style={{
                              transition: "background-color 0.3s ease",
                              borderRadius: "8px",
                              padding: "4px",
                            }}
                          >
                            <PanelLeftTextRegular className="w-10 h-9 text-gray-700 float-right" />
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                  <LLMDropdown onItemSelect={onItemSelect} />
                </Stack>
              </div>
              {appStateContext?.state.chatHistoryLoadingState ===
              ChatHistoryLoadingState.Loading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner className="self-start h-20 w-20 mr-1.25" />
                  <span className="text-lg font-medium mt-2">
                    履歴を読み込んでいます...
                  </span>
                </div>
              ) : !messages || messages.length < 1 ? (
                <Stack className="flex-grow flex flex-col justify-center items-center">
                  <span
                    className="animate-fadeIn text-6xl font-serif"
                    aria-hidden="true"
                  >
                    こんにちは、{user.displayName}さん
                    <br />
                    本日はいかがいたしましょうか？
                  </span>
                  {/*
                  <div className="mt-4">
                    {ExamplePrompts.map((prompt, index) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-200 rounded-lg shadow-md text-gray-800 text-sm leading-6 max-w-[80%] whitespace-pre-wrap break-words font-sans cursor-pointer mb-2"
                        onClick={() => handlePromptClick(prompt)}
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                  */}
                </Stack>
              ) : (
                <div
                  className="flex-grow max-w-[60%] w-full overflow-y-auto px-6 flex flex-col mt-6"
                  style={{ marginBottom: isLoading ? "40px" : "0px" }}
                  role="log"
                >
                  {messages.map((answer, index) => (
                    <>
                      {answer.role === "user" ? (
                        <div className="flex justify-end mb-3" tabIndex={0}>
                          <div className="flex p-5 bg-gray-200 rounded-lg shadow-md text-gray-800 text-sm leading-6 max-w-[80%] whitespace-pre-wrap break-words font-sans">
                            {answer.content}
                          </div>
                        </div>
                      ) : answer.role === "assistant" ? (
                        <div className="mb-3 max-w-[80%] flex">
                          <Answer
                            answer={{
                              answer: answer.content,
                              citations: parseCitationFromMessage(
                                messages[index - 1]
                              ),
                              message_id: answer.id,
                              feedback: answer.feedback,
                            }}
                            onCitationClicked={(c) => onShowCitation(c)}
                          />
                        </div>
                      ) : answer.role === ERROR ? (
                        <div className="p-5 rounded-lg shadow-md text-gray-800 text-sm leading-6 max-w-[800px] mb-3 border border-red-600">
                          <Stack
                            horizontal
                            className="font-sans text-sm leading-6 whitespace-pre-wrap break-words gap-3 items-center"
                          >
                            <ErrorCircleRegular
                              className="text-red-600"
                              style={{ color: "rgba(182, 52, 67, 1)" }}
                            />
                            <span>Error</span>
                          </Stack>
                          <span className="font-sans text-sm leading-6 whitespace-pre-wrap break-words gap-3 items-center">
                            {answer.content}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ))}
                  {showLoadingMessage && (
                    <>
                      <div className="mb-3 max-w-[80%] flex">
                        <Answer
                          answer={{
                            answer: "Generating answer...",
                            citations: [],
                          }}
                          onCitationClicked={() => null}
                        />
                      </div>
                    </>
                  )}
                  <div ref={chatMessageStreamEnd} />
                </div>
              )}
              <Stack
                horizontal
                className="sticky flex-0 px-6 w-[calc(100%-100px)] max-w-[60%] mb-12 mt-2"
              >
                {isLoading && (
                  <Stack
                    horizontal
                    className="box-border flex flex-row justify-center items-center p-1.5 gap-1 absolute w-[161px] h-[32px] left-[calc(50%-161px/2+25.8px)] bottom-[116px] border border-gray-300 rounded-lg"
                    role="button"
                    aria-label="Stop generating"
                    tabIndex={0}
                    onClick={stopGenerating}
                    onKeyDown={(e) =>
                      e.key === "Enter" || e.key === " "
                        ? stopGenerating()
                        : null
                    }
                  >
                    <SquareRegular
                      className="w-3.5 h-3.5 text-gray-700"
                      aria-hidden="true"
                    />
                    <span
                      className="w-[103px] h-[20px] font-semibold text-sm leading-5 text-gray-800 flex-none order-0 flex-grow-0"
                      aria-hidden="true"
                    >
                      Stop generating
                    </span>
                  </Stack>
                )}
                <QuestionInput
                  id="questionInput"
                  clearOnSend
                  placeholder="AIにメッセージを送信する"
                  disabled={isLoading}
                  onSend={(question, file, id) => {
                    if (appStateContext?.state.isCosmosDBAvailable?.cosmosDB) {
                      makeApiRequestWithCosmosDB(question, file, id); // Updated to include file
                    } else {
                      makeApiRequestWithoutCosmosDB(question, file, id); // Updated to include file
                    }
                  }}
                  conversationId={
                    appStateContext?.state.currentChat?.id
                      ? appStateContext?.state.currentChat?.id
                      : undefined
                  }
                />
              </Stack>
            </div>
            {messages &&
              messages.length > 0 &&
              isCitationPanelOpen &&
              activeCitation && (
                <Stack.Item
                  className="flex flex-col items-start p-4 gap-2 bg-white shadow-md rounded-lg flex-auto order-0 self-stretch flex-grow-[0.3] max-w-[30%] overflow-y-scroll max-h-[calc(100vh-100px)]"
                  tabIndex={0}
                  role="tabpanel"
                  aria-label="Citations Panel"
                >
                  <Stack
                    aria-label="Citations Panel Header Container"
                    horizontal
                    className="w-full"
                    horizontalAlign="space-between"
                    verticalAlign="center"
                  >
                    <span
                      aria-label="Citations"
                      className="font-semibold text-lg leading-6 text-black flex-none order-0 flex-grow-0"
                    >
                      Citations
                    </span>
                    <IconButton
                      iconProps={{ iconName: "Cancel" }}
                      aria-label="Close citations panel"
                      onClick={() => setIsCitationPanelOpen(false)}
                    />
                  </Stack>
                  <h5
                    className="font-semibold text-base leading-6 text-gray-800 mt-3 mb-3"
                    tabIndex={0}
                    title={
                      activeCitation.url &&
                      !activeCitation.url.includes("blob.core")
                        ? activeCitation.url
                        : activeCitation.title ?? ""
                    }
                    onClick={() => onViewSource(activeCitation)}
                  >
                    {activeCitation.title}
                  </h5>
                  <div tabIndex={0}>
                    <ReactMarkdown
                      linkTarget="_blank"
                      className="font-normal text-sm leading-5 text-black flex-none order-1 self-stretch flex-grow-0"
                      children={DOMPurify.sanitize(activeCitation.content, {
                        ALLOWED_TAGS: XSSAllowTags,
                      })}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    />
                  </div>
                </Stack.Item>
              )}
          </Stack>
        </div>
      ) : (
        <Navigate to="/login" />
      )}
    </>
  );
};

export default AuthChat;
