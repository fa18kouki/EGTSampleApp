"use client";
import React from "react";
import styles from "./Login.module.css";
function Login() {
  return (
    <div className={styles.container}>
      <form className={styles.form}>
        <h2 className={styles.title}>
          ログイン
        </h2>
        <div className="mb-4">
          <label
            htmlFor="organization"
            className={styles.label}
          >
            組織名
          </label>
          <input
            type="text"
            name="organization"
            id="organization"
            className={styles.input}
            placeholder="組織名を入力"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="username"
            className={styles.label}
          >
            ユーザー名
          </label>
          <input
            type="text"
            name="username"
            id="username"
            className={styles.input}
            placeholder="ユーザー名を入力"
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="password"
            className={styles.label}
          >
            パスワード
          </label>
          <input
            type="password"
            name="password"
            id="password"
            className={styles.input}
            placeholder="パスワードを入力"
          />
        </div>
        <button
          type="submit"
          className={styles.button}
        >
          ログイン
        </button>
      </form>
    </div>
  );
}

export default Login;