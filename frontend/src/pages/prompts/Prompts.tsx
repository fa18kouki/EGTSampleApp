"use client";
import React, { useState, useEffect } from "react";
import styles from "./Prompts.module.css";
import {
  addPrompt,
  getPrompts,
  deletePrompt,
} from "../../api";
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

const MainComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [newPrompt, setNewPrompt] = useState<NewPrompt>({ userName: "", content: "", tags: [""] });
  const [editPrompt, setEditPrompt] = useState<Prompt>({ id: null, userName: "", content: "", tags: [""] });
  const [prompts, setPrompts] = useState<Prompt[]>([
  ]);

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
  

  const handleAddPrompt = async (newPrompt:NewPrompt) => {
    let response = await addPrompt(
      newPrompt.userName,
      newPrompt.content,
      newPrompt.tags,
    );
    if (response.status === 200) {
      const data = await response.json();
      setNewPrompt(data);
    }
    else{
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
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="タグで検索"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.input}
        />
      </div>
      <button
        onClick={() => setShowAddModal(true)}
        className={styles.addButton}
      >
        プロンプトを追加
      </button>
      <div className={styles.promptsGrid}>
        {filteredPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className={styles.promptCard}
            onClick={() => setSelectedPrompt(prompt)}
          >
            <h3 className={styles.promptTitle}>
              {prompt.userName}
            </h3>
            <p className={styles.promptPreview}>{prompt.preview}</p>
            <div className={styles.tagContainer}>
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className={styles.tag}
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              className={styles.editButton}
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {selectedPrompt.userName}
            </h2>
            <p className={styles.modalText}>{selectedPrompt.content}</p>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedPrompt(null)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <input
              type="text"
              placeholder="ユーザー名"
              value={newPrompt.userName}
              onChange={(e) =>
                setNewPrompt({ ...newPrompt, userName: e.target.value })
              }
              className={styles.modalInput}
              name="userName"
            />
            <textarea
              placeholder="商品の内容"
              value={newPrompt.content}
              onChange={(e) =>
                setNewPrompt({ ...newPrompt, content: e.target.value })
              }
              className={styles.modalInput}
              name="content"
            ></textarea>
            <input
              type="text"
              placeholder="タグ (カンマ区切り)"
              value={newPrompt.tags}
              onChange={(e) =>
                setNewPrompt({ ...newPrompt, tags: e.target.value.split(",") })
              }
              className={styles.modalInput}
              name="tags"
            />
            <button
              className={styles.createButton}
              onClick={() => handleAddPrompt(newPrompt)}
            >
              作成
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => setShowAddModal(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <input
              type="text"
              placeholder="ユーザー名"
              value={editPrompt.userName}
              onChange={(e) =>
                setEditPrompt({ ...editPrompt, userName: e.target.value })
              }
              className={styles.modalInput}
              name="userName"
            />
            <textarea
              placeholder="商品の内容"
              value={editPrompt.content}
              onChange={(e) =>
                setEditPrompt({ ...editPrompt, content: e.target.value })
              }
              className={styles.modalInput}
              name="content"
            />
            <input
              type="text"
              placeholder="タグ (カンマ区切り)"
              value={editPrompt.tags}
              onChange={(e) =>
                setEditPrompt({ ...editPrompt, tags: e.target.value.split(",") })
              }
              className={styles.modalInput}
              name="tags"
            />
            <button
              className={styles.updateButton}
              onClick={handleUpdatePrompt}
            >
              更新
            </button>
            <button
              className={styles.cancelButton}
              onClick={
                () => setShowEditModal(false)
              }
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainComponent;
