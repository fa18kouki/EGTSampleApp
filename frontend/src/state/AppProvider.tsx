import React, { createContext, ReactNode, useEffect, useReducer } from 'react'
import {
  ChatHistoryLoadingState,
  Conversation,
  CosmosDBHealth,
  CosmosDBStatus,
  Feedback,
  FrontendSettings,
  frontendSettings,
  historyEnsure,
  historyList
} from '../api'
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../FirebaseConfig";
import { appStateReducer } from './AppReducer'

export interface AppState {
  isChatHistoryOpen: boolean
  chatHistoryLoadingState: ChatHistoryLoadingState
  isCosmosDBAvailable: CosmosDBHealth
  chatHistory: Conversation[] | null
  filteredChatHistory: Conversation[] | null
  currentChat: Conversation | null
  frontendSettings: FrontendSettings | null
  feedbackState: { [answerId: string]: Feedback.Neutral | Feedback.Positive | Feedback.Negative }
  user: User | null
  isUsersPanelOpen: boolean
}

export type Action =
  | { type: 'TOGGLE_CHAT_HISTORY' }
  | { type: 'SET_COSMOSDB_STATUS'; payload: CosmosDBHealth }
  | { type: 'UPDATE_CHAT_HISTORY_LOADING_STATE'; payload: ChatHistoryLoadingState }
  | { type: 'UPDATE_CURRENT_CHAT'; payload: Conversation | null }
  | { type: 'UPDATE_FILTERED_CHAT_HISTORY'; payload: Conversation[] | null }
  | { type: 'UPDATE_CHAT_HISTORY'; payload: Conversation }
  | { type: 'UPDATE_CHAT_TITLE'; payload: Conversation }
  | { type: 'DELETE_CHAT_ENTRY'; payload: string }
  | { type: 'DELETE_CHAT_HISTORY' }
  | { type: 'DELETE_CURRENT_CHAT_MESSAGES'; payload: string }
  | { type: 'FETCH_CHAT_HISTORY'; payload: Conversation[] | null }
  | { type: 'FETCH_FRONTEND_SETTINGS'; payload: FrontendSettings | null }
  | {
      type: 'SET_FEEDBACK_STATE'
      payload: { answerId: string; feedback: Feedback.Positive | Feedback.Negative | Feedback.Neutral }
    }
  | { type: 'GET_FEEDBACK_STATE'; payload: string }
  | { type: 'UPDATE_USER'; payload: User | null }
  | { type: 'TOGGLE_USERS_PANEL' }

const initialState: AppState = {
  isChatHistoryOpen: false,
  chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
  chatHistory: null,
  filteredChatHistory: null,
  currentChat: null,
  isCosmosDBAvailable: {
    cosmosDB: false,
    status: CosmosDBStatus.NotConfigured
  },
  frontendSettings: null,
  feedbackState: {},
  user: null,
  isUsersPanelOpen: false
}

const loadState = (): AppState => {
  try {
    const serializedState = sessionStorage.getItem('appState');
    if (serializedState === null) {
      return initialState;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Could not load state', err);
    return initialState;
  }
}

const saveState = (state: AppState) => {
  try {
    const serializedState = JSON.stringify(state);
    sessionStorage.setItem('appState', serializedState);
  } catch (err) {
    console.error('Could not save state', err);
  }
}

export const AppStateContext = createContext<
  | {
      state: AppState
      dispatch: React.Dispatch<Action>
    }
  | undefined
>(undefined)

type AppStateProviderProps = {
  children: ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, loadState())

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        dispatch({ type: 'UPDATE_USER', payload: currentUser });
      } else {
        dispatch({ type: 'UPDATE_USER', payload: null });
      }
    });
  }, []);

  useEffect(() => {
    const fetchChatHistory = async (offset = 0): Promise<Conversation[] | null> => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      try {
        const idToken = await currentUser.getIdToken();
        const result = await historyList(offset, idToken);
        dispatch({ type: 'FETCH_CHAT_HISTORY', payload: result });
        return result;
      } catch (error) {
        console.error('There was an issue fetching your data.', error);
        dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail });
        dispatch({ type: 'FETCH_CHAT_HISTORY', payload: null });
        return null;
      }
    }

    const getHistoryEnsure = async () => {
      //dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Loading })
      historyEnsure()
        .then(response => {
          if (response?.cosmosDB) {
            if (state.user !== null) {
              fetchChatHistory()
                .then(res => {
                  if (res) {
                    dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Success })
                    dispatch({ type: 'SET_COSMOSDB_STATUS', payload: response })
                  } else {
                    dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
                    dispatch({
                      type: 'SET_COSMOSDB_STATUS',
                      payload: { cosmosDB: false, status: CosmosDBStatus.NotWorking }
                    })
                  }
                })
                .catch(_err => {
                  dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
                  dispatch({
                    type: 'SET_COSMOSDB_STATUS',
                    payload: { cosmosDB: false, status: CosmosDBStatus.NotWorking }
                  })
                })
            } else {
              dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
              dispatch({
                type: 'SET_COSMOSDB_STATUS',
                payload: { cosmosDB: false, status: CosmosDBStatus.NotWorking }
              })
            }
          } else {
            dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
            dispatch({ type: 'SET_COSMOSDB_STATUS', payload: response })
          }
        })
        .catch(_err => {
          dispatch({ type: 'UPDATE_CHAT_HISTORY_LOADING_STATE', payload: ChatHistoryLoadingState.Fail })
          dispatch({ type: 'SET_COSMOSDB_STATUS', payload: { cosmosDB: false, status: CosmosDBStatus.NotConfigured } })
        })
    }
    getHistoryEnsure()
  }, [state.chatHistoryLoadingState, state.user])

  useEffect(() => {
    console.log("FrontendSettings")
    const getFrontendSettings = async () => {
      frontendSettings()
        .then(response => {
          dispatch({ type: 'FETCH_FRONTEND_SETTINGS', payload: response as FrontendSettings })
        })
        .catch(_err => {
          console.error('There was an issue fetching your data.')
        })
    }
    getFrontendSettings()
  }, [])
  console.log('AppProviderState: ', state);
  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
}