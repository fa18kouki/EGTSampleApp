import React, { useState, useEffect, useRef } from "react";
import { ChevronDoubleDownFilled } from '@fluentui/react-icons';

interface Item {
  name: string;
  key: string;
}

interface DropdownProps {
  onItemSelect: (item: Item) => void;
}

export const UserDropdown: React.FC<DropdownProps> = ({ onItemSelect }) => {
  const items: Item[] = [
    {
      name: "アカウントを削除",
      key: "delete-account",
    },
    {
      name: "ログアウト",
      key: "logout",
    },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item.name);
    onItemSelect(item);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-80" ref={dropdownRef}>
      <div
        className="p-4 text-lg rounded cursor-pointer flex items-center transition-colors duration-300"
        onClick={handleDropdownToggle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f0f0f0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        style={{
          transition: "background-color 0.3s ease",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        <ChevronDoubleDownFilled className="mr-2 mt-1" />
        {selectedItem !== null ? selectedItem : "オプションを選択"}
      </div>
      {isOpen && (
        <div className="absolute w-full bg-white border border-gray-300 border-t-0 rounded-b shadow-lg z-10">
          {items.map((item) => (
            <div
              key={item.key}
              className={`px-5 py-4 cursor-pointer transition-colors duration-300 flex flex-col hover:bg-gray-100 ${item.key === "delete-account" ? "text-red-600" : ""}`}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              style={{
                transition: "background-color 0.3s ease",
                borderRadius: "8px",
                padding: "8px",
              }}
            >
              <div className="text-lg font-bold flex items-center">
                {item.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};