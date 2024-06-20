"use client";
import React from "react";

function MainComponent() {
  type User = {
    localId: string;
    displayName: string;
    email: string;
    emailVerified: boolean;
    lastLoginAt: string;
  };
  const [users, setUsers] = React.useState<User[]>([]);
  const [activeSection, setActiveSection] = React.useState("data-list");

  React.useEffect(() => {
    if (activeSection === "user-list") {
      fetch("/users", { method: "GET" })
        .then((response) => response.json())
        .then((data) => setUsers(data));
    }
  }, [activeSection]);

  const handleSidebarClick = (section: string) => {
    setActiveSection(section);
  };

  const sidebarItems = [
    { label: "データ一覧", key: "data-list" },
    { label: "ユーザー一覧", key: "user-list" },
    { label: "使用量", key: "usage" },
  ];

  const tableColumns = [
    { header: "DisplayName", key: "displayName" },
    { header: "Email", key: "email" },
    { header: "EmailVerified", key: "emailVerified" },
    { header: "LastLoginAt", key: "lastLoginAt" },
    { header: "Actions", key: "actions" },
  ];

  return (
    <div className="flex h-screen bg-[#000000] text-[#FFFFFF] font-arial">
      <div className="w-[250px] bg-[#333333] p-[10px]">
        <ul>
          {sidebarItems.map((item) => (
            <li
              key={item.label}
              className="mb-[20px] cursor-pointer hover:bg-[#555555]"
              onClick={() => handleSidebarClick(item.key)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 p-[10px]">
        {activeSection === "data-list" && <div>何も表示しない</div>}
        {activeSection === "user-list" && (
          <>
            <h1 className="text-[18px] mb-[10px]">ユーザー一覧</h1>
            <table className="w-full">
              <thead>
                <tr>
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className="p-[10px] border-b border-[#A9A9A9]"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColumns.length}
                      className="p-[10px] border-b border-[#A9A9A9]"
                    >
                      No users available.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.localId}>
                      <td className="p-[10px] border-b border-[#A9A9A9]">
                        {user.displayName}
                      </td>
                      <td className="p-[10px] border-b border-[#A9A9A9]">
                        {user.email}
                      </td>
                      <td className="p-[10px] border-b border-[#A9A9A9]">
                        {user.emailVerified ? "Yes" : "No"}
                      </td>
                      <td className="p-[10px] border-b border-[#A9A9A9]">
                        {user.lastLoginAt}
                      </td>
                      <td className="p-[10px] border-b border-[#A9A9A9]">
                        <button
                          className="mr-[5px] p-[5px] bg-[#00FF00] text-[#000000]"
                          onClick={() => alert(`Edit: ${user.localId}`)}
                        >
                          Edit
                        </button>
                        <button
                          className="p-[5px] bg-[#FF0000] text-[#FFFFFF]"
                          onClick={() => alert(`Delete: ${user.localId}`)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
        {activeSection === "usage" && (
          <div>
            <h1 className="text-[18px] mb-[10px]">使用量</h1>
            {/* グラフをここに追加 */}
          </div>
        )}
      </div>
    </div>
  );
}

export default MainComponent;