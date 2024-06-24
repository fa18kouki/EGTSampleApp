import React, { useState, useEffect, useContext } from "react";
import styles from "./Prompts.module.css";
import { addPrompt, getPrompts, deletePrompt } from "../../api";
import { AppStateContext } from "../../state/AppProvider";

interface Prompt {
  id: number | null;
  userName: string;
  preview?: string;
  tags: string[];
  content: string;
}

interface NewPrompt {
  userName: string;
  content: string;
  tags: string[];
}
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../../FirebaseConfig";
const MainComponent: React.FC = () => {
  const appStateContext = useContext(AppStateContext);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [newPrompt, setNewPrompt] = useState<NewPrompt>({
    userName: "",
    content: "",
    tags: [""],
  });
  const [editPrompt, setEditPrompt] = useState<Prompt>({
    id: null,
    userName: "",
    content: "",
    tags: [""],
  });
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    const fetchPrompts = async () => {
      const response = await getPrompts();
      if (response.status === 200) {
        const data = await response.json();
        setPrompts(data);
      } else {
        console.error("プロンプトの取得に失敗しました。");
      }
    };

    fetchPrompts();
  }, []);

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

  const handleAddPrompt = async (newPrompt: NewPrompt) => {
    let response = await addPrompt(
      newPrompt.userName,
      newPrompt.content,
      newPrompt.tags
    );
    if (response.status === 200) {
      const data = await response.json();
      setNewPrompt(data);
    } else {
      console.log("Error");
    }
    setShowAddModal(false);
  };

  const handleSubmit = (): void => {
    prompts.push({
      id: prompts.length + 1,
      userName: newPrompt.userName,
      content: newPrompt.content,
      tags: newPrompt.tags,
      preview: newPrompt.content.slice(0, 10) + "...",
    });
    setNewPrompt({ userName: "", content: "", tags: [""] });
    setShowAddModal(false);
  };

  const handleEditPrompt = (prompt: Prompt): void => {
    setEditPrompt({
      id: prompt.id,
      userName: prompt.userName,
      content: prompt.content,
      tags: prompt.tags,
    });
    setShowEditModal(true);
  };

  const handleUpdatePrompt = (): void => {
    const updatedPrompts = prompts.map((prompt) => {
      if (prompt.id === editPrompt.id) {
        return {
          ...prompt,
          userName: editPrompt.userName,
          content: editPrompt.content,
          tags: editPrompt.tags,
          preview: editPrompt.content.slice(0, 10) + "...",
        };
      }
      return prompt;
    });
    setSelectedPrompt(null);
    setShowEditModal(false);
  };

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.tags.some((tag) =>
      tag.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <>
      {!loading && (
        <>
          {user && (
            <div className="w-4/5 mx-auto p-5">
              <div className="mb-5">
                <input
                  type="text"
                  placeholder="タグで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="p-2.5 bg-black text-white rounded cursor-pointer mb-5"
              >
                プロンプトを追加
              </button>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 mb-5">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-white rounded shadow p-5 mb-5 transition-transform duration-300 hover:translate-y-[-5px]"
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <h3 className="text-xl font-bold mb-2.5">
                      {prompt.userName}
                    </h3>
                    <p className="text-gray-600 mb-2.5">{prompt.preview}</p>
                    <div className="flex flex-wrap">
                      {prompt.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-200 text-gray-700 p-2.5 rounded-full mr-2.5 mb-2.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      className="p-2.5 bg-black text-white rounded cursor-pointer mt-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPrompt(prompt);
                      }}
                    >
                      編集
                    </button>
                  </div>
                ))}
              </div>
              {selectedPrompt && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-5 rounded w-11/12 max-w-lg shadow">
                    <h2 className="text-2xl font-bold mb-5">
                      {selectedPrompt.userName}
                    </h2>
                    <p className="text-gray-800 mb-5">
                      {selectedPrompt.content}
                    </p>
                    <button
                      className="p-2.5 bg-blue-500 text-white rounded cursor-pointer"
                      onClick={() => setSelectedPrompt(null)}
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
              {showAddModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-5 rounded w-11/12 max-w-lg shadow">
                    <input
                      type="text"
                      placeholder="ユーザー名"
                      value={user?.displayName || "不明"}
                      readOnly
                      className="w-full p-2.5 border border-gray-300 rounded mb-5"
                      name="userName"
                    />
                    <textarea
                      className="w-full mb-2 mx-3 leading-6 border-none resize-none overflow-auto"
                      placeholder="商品の内容"
                      value={newPrompt.content}
                      onChange={(e) => {
                        setNewPrompt({ ...newPrompt, content: e.target.value });
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(
                          Math.max(e.target.scrollHeight, 128),
                          304
                        )}px`;
                      }}
                      style={{
                        overflowY: "auto",
                        minHeight: "128px",
                        maxHeight: "320px",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="タグ (カンマ区切り)"
                      value={newPrompt.tags}
                      onChange={(e) =>
                        setNewPrompt({
                          ...newPrompt,
                          tags: e.target.value.split(","),
                        })
                      }
                      className="w-full p-2.5 border border-gray-300 rounded mb-5"
                      name="tags"
                    />
                    <button
                      className="p-2.5 bg-blue-600 text-white rounded cursor-pointer"
                      onClick={async () => {
                        await handleAddPrompt(newPrompt);
                        window.location.reload();
                      }}
                    >
                      作成
                    </button>
                    <button
                      className="p-2.5 bg-gray-600 text-white rounded cursor-pointer ml-2.5"
                      onClick={() => setShowAddModal(false)}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
              {showEditModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-5 rounded w-11/12 max-w-lg shadow">
                    <input
                      type="text"
                      placeholder="ユーザー名"
                      value={editPrompt.userName}
                      onChange={(e) =>
                        setEditPrompt({
                          ...editPrompt,
                          userName: e.target.value,
                        })
                      }
                      className="w-full p-2.5 border border-gray-300 rounded mb-5"
                      name="userName"
                    />
                    <textarea
                      placeholder="商品の内容"
                      value={editPrompt.content}
                      onChange={(e) =>
                        setEditPrompt({
                          ...editPrompt,
                          content: e.target.value,
                        })
                      }
                      className="w-full p-2.5 border border-gray-300 rounded mb-5"
                      name="content"
                    />
                    <input
                      type="text"
                      placeholder="タグ (カンマ区切り)"
                      value={editPrompt.tags}
                      onChange={(e) =>
                        setEditPrompt({
                          ...editPrompt,
                          tags: e.target.value.split(","),
                        })
                      }
                      className="w-full p-2.5 border border-gray-300 rounded mb-5"
                      name="tags"
                    />
                    <button
                      className="p-2.5 bg-blue-600 text-white rounded cursor-pointer"
                      onClick={handleUpdatePrompt}
                    >
                      更新
                    </button>
                    <button
                      className="p-2.5 bg-gray-600 text-white rounded cursor-pointer ml-2.5"
                      onClick={() => setShowEditModal(false)}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MainComponent;
