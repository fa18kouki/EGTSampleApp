import React, { useState, useEffect } from "react";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import {
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
} from "@fluentui/react-components";
import {
  NavigationFilled,
  FolderPeople24Filled,
  FolderPeople24Regular,
} from "@fluentui/react-icons";
import { useNavigate } from "react-router-dom";
import { DeleteUser } from "../../api/api";

interface User {
  localId: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const UserListDialog: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/users");
      if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }
      const data = await response.json();
      const formattedUsers = data.map((user: any) => ({
        localId: user._data.localId,
        email: user._data.email,
        displayName: user._data.displayName || "",
        createdAt: new Date(parseInt(user._data.createdAt)).toLocaleString(),
        lastLoginAt: user._data.lastLoginAt
          ? new Date(parseInt(user._data.lastLoginAt)).toLocaleString()
          : "未ログイン",
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      //await DeleteUser(user);
      await fetchUsers(); // ユーザー一覧を再取得
    } catch (error) {
      console.error("ユーザーの削除中にエラーが発生しました:", error);
      // エラーメッセージを表示するなどの処理を追加してください
    }
  };

  if (!isOpen) {
    return (
      <MenuItem icon={<FolderPeople24Filled />} onClick={() => setIsOpen(true)}>
        ユーザー一覧
      </MenuItem>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[600px] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">ユーザー一覧</h2>
        <div className="mb-4 flex justify-between items-center">
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center"
            onClick={() => navigate("/signup")}
          >
            <AddRegular className="h-5 w-5 mr-2" />
            ユーザーを追加
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">メールアドレス</th>
              <th className="px-4 py-2 text-left">表示名</th>
              <th className="px-4 py-2 text-left">作成日時</th>
              <th className="px-4 py-2 text-left">最終ログイン</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.localId} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{user.localId}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.displayName || "-"}</td>
                <td className="px-4 py-2">{user.createdAt}</td>
                <td className="px-4 py-2">{user.lastLoginAt}</td>
                <td className="px-4 py-2">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <DeleteRegular className="h-4 w-4 mr-1" />
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-right">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            onClick={() => setIsOpen(false)}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
