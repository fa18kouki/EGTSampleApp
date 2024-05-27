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
} from "@fluentui/react";
import {
  SquareRegular,
  ShieldLockRegular,
  ErrorCircleRegular,
} from "@fluentui/react-icons";
import {
  Dropdown,
  makeStyles,
  Option,
  useId,
  Persona,
  Button,
} from "@fluentui/react-components";
import type { DropdownProps } from "@fluentui/react-components";
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
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";
import { SettingsButton } from "../../components/SettingsButton";
import fv_text1_black from "../../assets/fv_text1_black.png";
import fv_text2_black from "../../assets/fv_text2_black.png";
import fv_text3_black from "../../assets/fv_text3_black.png";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
import { useNavigate, Navigate } from "react-router-dom";
import {
  ArrowExportLtrFilled,
  ArrowExportRtlFilled,
} from "@fluentui/react-icons";

const enum messageStatus {
  NotRunning = "Not Running",
  Processing = "Processing",
  Done = "Done",
}

const AuthChat = () => {
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled;
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<Citation>();
  const [isCitationPanelOpen, setIsCitationPanelOpen] =
    useState<boolean>(false);
  const abortFuncs = useRef([] as AbortController[]);
  const [showAuthMessage, setShowAuthMessage] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processMessages, setProcessMessages] = useState<messageStatus>(
    messageStatus.NotRunning
  );
  const [hideHistoryLabel, setHideHistoryLabel] = useState<string>("Close");
  const [showHistoryLabel, setShowHistoryLabel] = useState<string>("Open");
  const [clearingChat, setClearingChat] = useState<boolean>(false);
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>();
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [gptModel, setGptModel] = useState<string>("gpt-3.5-turbo-16k");
  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: "Close",
    subText: errorMsg?.subtitle,
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
  const options = [
    "Cat",
    "Caterpillar",
    "Corgi",
    "Chupacabra",
    "Dog",
    "Ferret",
    "Fish",
    "Fox",
    "Hamster",
    "Snake",
  ];
  const [ASSISTANT, TOOL, ERROR] = ["assistant", "tool", "error"];
  const NO_CONTENT_ERROR = "No content in messages object.";

  const handleHistoryClick = () => {
    appStateContext?.dispatch({ type: "TOGGLE_CHAT_HISTORY" });
  };
  /*
  const gpt_models: IDropdownOption[] = [
    { key: "gpt-3.5-turbo-16k", text: "GPT-3.5-TURBO16K" },
    { key: "gpt-4", text: "GPT-4" },
    { key: "gpt-4-32k", text: "GPT-4-32K" },
  ];
  */
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      appStateContext?.dispatch({
        type: "UPDATE_USER",
        payload: currentUser,
      });
    });
  }, []);

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
        };
      }
    } else {
      request = {
        messages: [userMessage].filter((answer) => answer.role !== ERROR),
        gptModel: gptModel,
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
            ? "Please try again. If the problem persists, please contact the site administrator."
            : responseJson.error;
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `There was an error generating a response. Chat history can't be saved at this time. ${errorResponseMessage}`,
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
                "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator.";
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

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList();
  }, [AUTH_ENABLED]);

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

  return (
    <>
      {!loading && (
        <>
          {!user ? (
            <Navigate to={`/login/`} />
          ) : (
            <div className={styles.container} role="main">
              
              <Stack horizontal className={styles.chatRoot}>
              {appStateContext?.state.isChatHistoryOpen &&
                  appStateContext?.state.isCosmosDBAvailable?.status !==
                    CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
                <div className={styles.chatContainer}>
                  <div className={styles.commandsContainer}>
                    <Stack horizontal>
                      {appStateContext?.state.isCosmosDBAvailable?.status !==
                        CosmosDBStatus.NotConfigured && (
                        <>
                        <Dropdown
                            placeholder="Select an animal"
                            appearance="underline"
                          >
                            {options.map((option) => (
                              <Option
                                key={option}
                                disabled={option === "Ferret"}
                              >
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                          {appStateContext?.state.isChatHistoryOpen ? (
                            <Button>
                              <ArrowExportLtrFilled
                                className={styles.historyArrow}
                                onClick={handleHistoryClick}
                              />
                            </Button>
                          ) : (
                            <ArrowExportRtlFilled
                              className={styles.historyArrow}
                              onClick={handleHistoryClick}
                            />
                          )}
                          
                        </>
                      )}
                    </Stack>
                  </div>
                  {!messages || messages.length < 1 ? (
                    <Stack className={styles.chatEmptyState}>
                      <img
                        src={fv_text1_black}
                        className={styles.chatIcon}
                        aria-hidden="true"
                      />
                      <img
                        src={fv_text2_black}
                        className={styles.chatIcon}
                        aria-hidden="true"
                      />
                      <img
                        src={fv_text3_black}
                        className={styles.chatIcon}
                        aria-hidden="true"
                      />
                    </Stack>
                  ) : (
                    <div
                      className={styles.chatMessageStream}
                      style={{ marginBottom: isLoading ? "40px" : "0px" }}
                      role="log"
                    >
                      {messages.map((answer, index) => (
                        <>
                          {answer.role === "user" ? (
                            <div
                              className={styles.chatMessageUser}
                              tabIndex={0}
                            >
                              <div className={styles.chatMessageUserMessage}>
                                {answer.content}
                              </div>
                            </div>
                          ) : answer.role === "assistant" ? (
                            <div className={styles.chatMessageGpt}>
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
                            <div className={styles.chatMessageError}>
                              <Stack
                                horizontal
                                className={styles.chatMessageErrorContent}
                              >
                                <ErrorCircleRegular
                                  className={styles.errorIcon}
                                  style={{ color: "rgba(182, 52, 67, 1)" }}
                                />
                                <span>Error</span>
                              </Stack>
                              <span className={styles.chatMessageErrorContent}>
                                {answer.content}
                              </span>
                            </div>
                          ) : null}
                        </>
                      ))}
                      {showLoadingMessage && (
                        <>
                          <div className={styles.chatMessageGpt}>
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

                  <Stack horizontal className={styles.chatInput}>
                    {isLoading && (
                      <Stack
                        horizontal
                        className={styles.stopGeneratingContainer}
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
                          className={styles.stopGeneratingIcon}
                          aria-hidden="true"
                        />
                        <span
                          className={styles.stopGeneratingText}
                          aria-hidden="true"
                        >
                          Stop generating
                        </span>
                      </Stack>
                    )}
                    <Stack>
                      {appStateContext?.state.isCosmosDBAvailable?.status !==
                        CosmosDBStatus.NotConfigured && (
                        <CommandBarButton
                          role="button"
                          styles={{
                            icon: {
                              color: "#FFFFFF",
                            },
                            iconDisabled: {
                              color: "#BDBDBD !important",
                            },
                            root: {
                              color: "#FFFFF",
                              background: "#808080", // 灰色の背景色に設定
                            },
                            rootDisabled: {
                              background: "#F0F0F0",
                            },
                          }}
                          className={styles.newChatIcon}
                          iconProps={{ iconName: "Add" }}
                          onClick={newChat}
                          disabled={disabledButton()}
                          aria-label="start a new chat button"
                        />
                      )}
                      <CommandBarButton
                        role="button"
                        styles={{
                          icon: {
                            color: "#FFFFFF",
                          },
                          iconDisabled: {
                            color: "#BDBDBD !important",
                          },
                          root: {
                            color: "#FFFFF",
                            background:
                              "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #FFFFFF 33.63%, #000000 100%)",
                          },
                          rootDisabled: {
                            background: "#F0F0F0",
                          },
                        }}
                        className={
                          appStateContext?.state.isCosmosDBAvailable?.status !==
                          CosmosDBStatus.NotConfigured
                            ? styles.clearChatBroom
                            : styles.clearChatBroomNoCosmos
                        }
                        iconProps={{ iconName: "Broom" }}
                        onClick={
                          appStateContext?.state.isCosmosDBAvailable?.status !==
                          CosmosDBStatus.NotConfigured
                            ? clearChat
                            : newChat
                        }
                        disabled={disabledButton()}
                        aria-label="clear chat button"
                      />
                      <Dialog
                        hidden={hideErrorDialog}
                        onDismiss={handleErrorDialogClose}
                        dialogContentProps={errorDialogContentProps}
                        modalProps={modalProps}
                      ></Dialog>
                    </Stack>
                    <QuestionInput
                      clearOnSend
                      placeholder="AIにメッセージを送信する"
                      disabled={isLoading}
                      onSend={(question, file, id) => {
                        if (
                          appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                        ) {
                          makeApiRequestWithCosmosDB(question, id); // Updated to include file
                        } else {
                          makeApiRequestWithoutCosmosDB(question, id); // Updated to include file
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
                {/* Citation Panel */}
                {messages &&
                  messages.length > 0 &&
                  isCitationPanelOpen &&
                  activeCitation && (
                    <Stack.Item
                      className={styles.citationPanel}
                      tabIndex={0}
                      role="tabpanel"
                      aria-label="Citations Panel"
                    >
                      <Stack
                        aria-label="Citations Panel Header Container"
                        horizontal
                        className={styles.citationPanelHeaderContainer}
                        horizontalAlign="space-between"
                        verticalAlign="center"
                      >
                        <span
                          aria-label="Citations"
                          className={styles.citationPanelHeader}
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
                        className={styles.citationPanelTitle}
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
                          className={styles.citationPanelContent}
                          children={DOMPurify.sanitize(activeCitation.content, {
                            ALLOWED_TAGS: XSSAllowTags,
                          })}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        />
                      </div>
                    </Stack.Item>
                  )}
                {appStateContext?.state.isChatHistoryOpen &&
                  appStateContext?.state.isCosmosDBAvailable?.status !==
                    CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
              </Stack>
              {/*}
      <Panel
        headerText="チャット設定"
        isOpen={false}
        isBlocking={false}
        onDismiss={() => setIsConfigPanelOpen(false)}
        closeButtonAriaLabel="Close"
        onRenderFooterContent={() => (
          <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>
            Close
          </DefaultButton>
        )}
        isFooterAtBottom={true}
      >
        <Dropdown
          className={styles.chatSettingsSeparator}
          defaultSelectedKey={[gptModel]}
          selectedKey={gptModel}
          label="GPT Model:"
          options={gpt_models}
          onChange={onGptModelChange}
        />
      </Panel>
      */}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AuthChat;