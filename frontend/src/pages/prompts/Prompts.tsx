import { useRef, useState, useEffect } from "react";
import { TextField, Panel, DefaultButton } from "@fluentui/react";
import { Dropdown, IDropdownOption } from "@fluentui/react/lib/Dropdown";
import { Outlet, NavLink, Link } from "react-router-dom";
import { SparkleFilled } from "@fluentui/react-icons";
import styles from "./Prompts.module.css";
import { QuestionInput } from "../../components/QuestionInput";
import { PromptCard } from "../../components/PromptCard";

const Prompt = () => {

    return (
        <div>
            <section className={styles.container}>
                <div className={styles.prompts}>
                <PromptCard
    name="山田太郎"
    documentTitle="プロジェクト提案書作成ガイド"
    documentContent="プロジェクトの目的、背景、期待される成果を明確に記述しましょう。また、具体的なアクションプランとタイムラインを設定することが重要です。"
/>
<PromptCard
    name="佐藤花子"
    documentTitle="業務報告書の書き方"
    documentContent="業務の進捗状況、達成した成果、遭遇した問題点、そして次のステップについて具体的に記述します。"
/>
<PromptCard
    name="鈴木一郎"
    documentTitle="会議議事録の効果的な作成方法"
    documentContent="会議での重要な議論ポイント、決定事項、行動計画について簡潔かつ正確に記録を取ります。参加者の発言は要約し、決定された事項は明確に記載します。"
/>
<PromptCard
    name="高橋由美子"
    documentTitle="顧客への提案書のポイント"
    documentContent="顧客のニーズや問題点を理解し、それに対するソリューションを提案します。提案の利点と効果を具体的に述べ、信頼性のあるデータを用いて支持します。"
/>
<PromptCard
    name="伊藤健太"
    documentTitle="メールでのビジネスコミュニケーション"
    documentContent="メールの件名は具体的かつ簡潔に。本文では挨拶から始め、要点を明確に伝えます。最後に、必要なアクションや返信期限を記載しましょう。"
/>
<PromptCard
    name="渡辺真理"
    documentTitle="プレゼンテーション資料の作り方"
    documentContent="聴衆の注意を引くために、視覚的に魅力的なスライドを作成します。ポイントは簡潔に、そして重要な情報は強調して表示しましょう。"
/>
<PromptCard
    name="中村輝"
    documentTitle="年次報告書の構成要素"
    documentContent="年次報告書では、組織の年間の業績、財務状況、市場での位置づけ、将来の見通しについて詳細に報告します。"
/>
<PromptCard
    name="小林雅"
    documentTitle="クライアントミーティングの準備"
    documentContent="このプロンプトは、特定のゴールを達成するための変数を明確にし、その変数を通じて具体的な成果物を出力するプロセスを案内します。
    ===========================
    
    # 変数の定義:
    ユーザーの回答やChatGPTの提案を格納する変数: project_variables
    
    # ステップ1: ゴールの特定
    「ゴールは何ですか？」と私に質問してください。
    ユーザーからの回答を基に、ゴール達成のための手順を提案します。
    
    # ステップ2: 手順の明確化
    提案された手順に対して、各ステップの詳細や変数を具体的に定めていきます。
    出力形式はテーブル形式として、1列目に手順、2列目にその内容、3列目に変数、4列目に値を記録します。
    
    # ステップ3: 変数の埋め込み
    変数に関連する提案や質問を行いながら、必要な情報を集約して変数の値を埋めていきます。
    
    # 制約 : すべての変数の値が定まったとき、最終的なプロンプトや成果物を出力します。
    
    ===========================
    ステップ1に進むため、「ゴールは何ですか？」と私に質問してください。"
/>

                </div>
            </section>
        </div>
    );
};

export default Prompt;
