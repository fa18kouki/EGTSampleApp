"use client";
import React from "react";
import styles from "./UserPage.module.css";

function UserPage() {
  const [selectedTab, setSelectedTab] = React.useState("tokenUsage");

  interface Prompt {
    id: number;
    title: string;
    preview: string;
    content: string;
    tags: string[];
  }

  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  
  const prompts = [
    {
      id: 1,
      title: "プロンプト1: プログラミングの学習方法",
      preview: "プログラミングを学ぶ最良の方法についての概要...",
      content: "プログラミングを学ぶ最良の方法は、実際にコードを書き始めることです。理論だけでなく、実際のプロジェクトに取り組むことで、問題解決能力が養われます。オンラインのチュートリアルやコースを利用するのも良いでしょうが、自分自身で小さなプロジェクトを始めることが重要です。また、コーディングのコミュニティに参加して、他の開発者と知識を共有することも有効です。",
      tags: ["プログラミング", "学習方法", "コーディング"],
    },
    {
      id: 2,
      title: "プロンプト2: リモートワークのメリットとデメリット",
      preview: "リモートワークの利点と欠点についての概要...",
      content: "リモートワークの最大のメリットは、通勤時間がなくなり、柔軟な働き方が可能になることです。しかし、自己管理のスキルが求められ、孤独感を感じやすいというデメリットもあります。リモートワークを成功させるには、明確なコミュニケーションと自己規律が必要です。また、仕事とプライベートの境界をしっかりと設けることも大切です。",
      tags: ["リモートワーク", "メリット", "デメリット"],
    },
    {
      id: 3,
      title: "プロンプト3: 持続可能な開発の重要性",
      preview: "持続可能な開発がなぜ重要なのかについての概要...",
      content: "持続可能な開発は、将来の世代が自分たちのニーズを満たすことができるように、現在の世代が資源を利用する方法を指します。これには、環境保護、経済成長、社会的公正が含まれます。技術の進歩を利用して、より効率的で環境に優しい方法で資源を利用することが重要です。持続可能な開発は、地球上の生命の未来を守るために不可欠です。",
      tags: ["持続可能性", "開発", "環境"],
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${selectedTab === "tokenUsage" ? styles.active : styles.inactive}`}
            onClick={() => setSelectedTab("tokenUsage")}
          >
            トークン使用量
          </button>
        </div>
        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${selectedTab === "myPrompts" ? styles.active : styles.inactive}`}
            onClick={() => setSelectedTab("myPrompts")}
          >
            Myプロンプト
          </button>
        </div>
      </div>
      <div className={styles.content}>
        {selectedTab === "tokenUsage" && (
          <>
            <h1 className={styles.title}>トークン使用量</h1>
            <div className={styles.infoBox}>
              <img
                src="token-usage-graph.jpg"
                alt="日毎のトークン使用量を示すグラフ"
                className={styles.fullImage}
              />
            </div>
          </>
        )}

        {selectedTab === "myPrompts" && (
          <>
            <h1 className={styles.title}>Myプロンプト</h1>
            {selectedPrompt ? (
              <div className={styles.promptDetail}>
                <h2 className={styles.promptTitle}>
                  {selectedPrompt.title}
                </h2>
                <p>{selectedPrompt.content}</p>
                <button
                  className={styles.backButton}
                  onClick={() => setSelectedPrompt(null)}
                >
                  戻る
                </button>
              </div>
            ) : (
              <div className={styles.promptContainer}>
                {prompts.map((prompt) => (
                  <div key={prompt.id} className={styles.promptCard}>
                    <div className={styles.promptHeader}>
                      <h2 className={styles.promptTitle}>{prompt.title}</h2>
                      {prompt.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className={styles.promptPreview}>{prompt.preview}</p>
                    <button
                      className={styles.moreButton}
                      onClick={() => setSelectedPrompt(prompt)}
                    >
                      もっと見る
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserPage;