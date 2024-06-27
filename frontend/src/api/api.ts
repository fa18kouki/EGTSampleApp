import { UserInfo, ConversationRequest, Conversation, ChatMessage, CosmosDBHealth, CosmosDBStatus } from "./models";
import { chatHistorySampleData } from "../constants/chatHistory";
import { auth } from "../../FirebaseConfig";
import { 
    signInWithEmailAndPassword ,
    createUserWithEmailAndPassword ,
    signOut,
    PasswordValidationStatus,
    AuthError,
    validatePassword,
    updatePassword,
    User,
    updateProfile,
    deleteUser,
} from "firebase/auth";

//基本的な認証はフロントエンド、カスタムクレーム、認証メールの送信はバックエンドで対応
export async function getUserInfo(): Promise<UserInfo[]> {
    const response = await fetch('/auth/me',{
        method: 'GET',
    });
    if (!response.ok) {
        console.log("No identity provider found. Access to chat will be blocked.")
        return [];
    }

    const payload = await response.json();
    return payload;
}

export async function getUsers(): Promise<User[]> {
    const response = await fetch('/auth/get_users',{
        method: 'GET',
    });
    return response.json();
}

export async function Login(email: string, password: string,displayName: string): Promise<User | AuthError> {
    try {
        const response = await signInWithEmailAndPassword(auth, email, password);
        return response.user;
    } catch (error) {
        console.error("Error signing in: ", error);
        return {
            message:"Unauthorized"
        } as AuthError;
    }
}

export async function Signup(email: string, password: string): Promise<User | AuthError> {
    try {
        const passwordValidation = await validatePassword(auth,password);
        if (passwordValidation.isValid) {
            throw new Error("Password is not valid");
        }
        const response = await createUserWithEmailAndPassword(auth, email, password);
        return response.user;
    } catch (error) {
        console.error("Error signing up: ", error);
        return {
            message:"Unauthorized"
        } as AuthError;
    }
}

export async function Logout(): Promise<void> {
    await signOut(auth);
}

export async function UpdataPassword(user: User, password: string): Promise<void> {
    await updatePassword(user, password);
}

export async function UpdateUser(user: User, displayName: string): Promise<void> {
    await updateProfile(user, { displayName: displayName });
}
/*
export async function DeleteUser(user_id: string): Promise<void> {
    await deleteUser(user_id);
}*/
export async function DeleteUser(user: User): Promise<void> {
    await deleteUser(user);
}

export async function getCC(user_id: string): Promise<string> {
    const response = await fetch('/auth/get_custom_claims',{
        method: 'GET',
        headers: {
            "user_id": user_id
        }
    });
    return response.text();
}

export async function setCC(user_id: string,claims: string, value: string): Promise<string> {
    const response = await fetch('/auth/set_custom_claims',{
        method: 'GET',
        headers: {
            "user_id": user_id,
            "claims": claims,
            "value": value
        }
    });
    return response.text();
}

export async function conversationApi(options: ConversationRequest, abortSignal: AbortSignal): Promise<Response> {
    const formData = new FormData();
    formData.append("messages", JSON.stringify(options.messages));
    formData.append("gptModel", options.gptModel);
    if (options.file) {
        options.file.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });
    }
    console.log("formData: ", formData)
    const response = await fetch("/conversation", {
        method: "POST",
        body: formData,
        signal: abortSignal
    });

    return response;
}

export const fetchChatHistoryInit = (): Conversation[] | null => {
    // Make initial API call here

    // return null;
    return chatHistorySampleData;
}

export const historyList = async (offset=0,idToken?:string): Promise<Conversation[] | null> => {
    const response = await fetch(`/history/list?offset=${offset}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${idToken}`
        }
    }).then(async (res) => {
        const payload = await res.json();
        if (!Array.isArray(payload)) {
            console.error("Payload is not an array.");
            return null;
        }
        const conversations: Conversation[] = await Promise.all(payload.map(async (conv: any) => {
            let convMessages: ChatMessage[] = [];
            convMessages = await historyRead(conv.id,idToken)
            .then((res) => {
                return res
            })
            .catch((err) => {
                console.error("error fetching messages: ", err)
                return []
            })
            const conversation: Conversation = {
                id: conv.id,
                title: conv.title,
                date: conv.createdAt,
                messages: convMessages
            };
            return conversation;
        }));
        return conversations;
    }).catch((err) => {
        console.error("historyList: There was an issue fetching your data.");
        return null
    })

    return response
}

export const historyRead = async (convId: string,idToken?:string): Promise<ChatMessage[]> => {
    const response = await fetch("/history/read", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId
        }),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    })
    .then(async (res) => {
        if(!res){
            return []
        }
        const payload = await res.json();
        let messages: ChatMessage[] = [];
        if(payload?.messages){
            payload.messages.forEach((msg: any) => {
                const message: ChatMessage = {
                    id: msg.id,
                    role: msg.role,
                    date: msg.createdAt,
                    content: msg.content,
                    feedback: msg.feedback ?? undefined
                }
                messages.push(message)
            });
        }
        return messages;
    }).catch((err) => {
        console.error("There was an issue fetching your data.");
        return []
    })
    return response
}

export const historyGenerate = async (options: ConversationRequest, abortSignal: AbortSignal, idToken?:string, convId?: string): Promise<Response> => {
    var formData = new FormData();
    formData.append("messages", JSON.stringify(options.messages));
    formData.append("gptModel", options.gptModel);
    if (options.file) {
        options.file.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });
    }
    if(convId){
        formData.append("conversation_id", convId)
    }
    const response = await fetch("/history/generate", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${idToken}`
        },
        body: formData,
        signal: abortSignal
    }).then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        return new Response;
    })
    return response
}

export const historyUpdate = async (messages: ChatMessage[], convId: string,idToken?:string): Promise<Response> => {
    const response = await fetch("/history/update", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
            messages: messages
        }),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    }).then(async (res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response
}

export const historyDelete = async (convId: string,idToken?:string) : Promise<Response> => {
    const response = await fetch("/history/delete", {
        method: "DELETE",
        body: JSON.stringify({
            conversation_id: convId,
        }),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyDeleteAll = async (idToken:string) : Promise<Response> => {
    const response = await fetch("/history/delete_all", {
        method: "DELETE",
        body: JSON.stringify({}),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyClear = async (convId: string,idToken?:string) : Promise<Response> => {
    const response = await fetch("/history/clear", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
        }),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyRename = async (convId: string, title: string,idToken?:string) : Promise<Response> => {
    const response = await fetch("/history/rename", {
        method: "POST",
        body: JSON.stringify({ 
            conversation_id: convId,
            title: title
        }),
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyEnsure = async (): Promise<CosmosDBHealth> => {
    const response = await fetch("/history/ensure", {
        method: "GET",
    })
    .then(async res => {
        let respJson = await res.json();
        let formattedResponse;
        if(respJson.message){
            formattedResponse = CosmosDBStatus.Working
        }else{
            if(res.status === 500){
                formattedResponse = CosmosDBStatus.NotWorking
            }else if(res.status === 401){
                formattedResponse = CosmosDBStatus.InvalidCredentials    
            }else if(res.status === 422){ 
                formattedResponse = respJson.error    
            }else{
                formattedResponse = CosmosDBStatus.NotConfigured
            }
        }
        if(!res.ok){
            return {
                cosmosDB: false,
                status: formattedResponse
            }
        }else{
            return {
                cosmosDB: true,
                status: formattedResponse
            }
        }
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        return {
            cosmosDB: false,
            status: err
        }
    })
    return response;
}

export const frontendSettings = async (): Promise<Response | null> => {
    const response = await fetch("/frontend_settings", {
        method: "GET",
    }).then((res) => {
        return res.json()
    }).catch((err) => {
        console.error("There was an issue fetching your data.");
        return null
    })

    return response
}
export const historyMessageFeedback = async (messageId: string, feedback: string): Promise<Response> => {
    const response = await fetch("/history/message_feedback", {
        method: "POST",
        body: JSON.stringify({
            message_id: messageId,
            message_feedback: feedback
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue logging feedback.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const addPrompt = async (userName: string, prompt: string, tags: string[]): Promise<Response> => {
    const response = await fetch("/prompt/add", {
        method: "POST",
        body: JSON.stringify({
            userName: userName,
            prompt: prompt,
            tags: tags,
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("プロンプトの追加中にエラーが発生しました。");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const getPrompts = async (): Promise<Response> => {
    const response = await fetch("/prompt/get_prompts", {
        method: "GET",
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching prompts.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const deletePrompt = async (promptId: string): Promise<Response> => {
    const response = await fetch("/delete_prompt", {
        method: "POST",
        body: JSON.stringify({
            promptId: promptId
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue deleting the prompt.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const editPrompt = async (promptId: string, prompt: string, tags: string[]): Promise<Response> => {
    const response = await fetch("/edit_prompt", {
        method: "POST",
        body: JSON.stringify({
            promptId: promptId,
            prompt: prompt,
            tags: tags
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue editing the prompt.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}
