import React, { useState, useEffect, useRef } from "react";
import { NavigationFilled, ChevronDoubleDownFilled } from '@fluentui/react-icons';

interface Item {
  name: string;
  description: string;
  key: string;
}

interface Group {
  title: string;
  items: Item[];
}

interface DropdownProps {
  onItemSelect: (item: Item) => void;
}

export const LLMDropdown: React.FC<DropdownProps> = ({ onItemSelect }) => {
  const groups: Group[] = [
    {
      title: "GPTモデル",
      items: [
        {
          name: "GPT-3.5",
          description: "OpenAIによって開発された高度な言語モデル",
          key: "gpt-3.5-turbo-0125",
        },
        {
          name: "GPT-4",
          description: "GPTシリーズの最新かつ最強のモデル",
          key: "gpt-4",
        },
        {
          name: "GPT-4o",
          description: "GPT-4のオープンソース版",
          key: "gpt-4o",
        },
      ],
    },
    {
      title: "Azureグループ",
      items: [
        {
          name: "Azure GPT-3.5",
          description: "Azureクラウドサービスと統合されたGPT-3.5",
          key: "az-gpt-3.5",
        },
        {
          name: "Azure GPT-4",
          description: "Azureクラウドサービスと統合されたGPT-4",
          key: "az-gpt-4",
        },
      ],
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
        {selectedItem !== null ? selectedItem : "GPT-4o"}
      </div>
      {isOpen && (
        <div className="absolute w-full bg-white border border-gray-300 border-t-0 rounded-b shadow-lg z-10">
          {groups.map((group, index) => (
            <div key={index} className="py-2">
              <div className="px-5 py-1 font-bold text-gray-600 bg-gray-200 text-base flex items-center">
                {group.title}
              </div>
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="px-5 py-4 cursor-pointer transition-colors duration-300 flex flex-col hover:bg-gray-100"
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
                  <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};