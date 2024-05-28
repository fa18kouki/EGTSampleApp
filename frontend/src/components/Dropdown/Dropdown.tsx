import React, { useState } from "react";
import styles from "./Dropdown.module.css"; // 追加するスタイルシート

interface Item {
  name: string;
  description: string;
}

interface Group {
  title: string;
  items: Item[];
}

interface DropdownProps {
  onItemSelect: (item: Item) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({ onItemSelect }) => {
  const groups: Group[] = [
    {
      title: "GPTモデル",
      items: [
        {
          name: "GPT-3.5",
          description: "OpenAIによって開発された高度な言語モデル。",
        },
        {
          name: "GPT-4",
          description: "GPTシリーズの最新かつ最強のモデル。",
        },
      ],
    },
    {
      title: "Azureグループ",
      items: [
        {
          name: "Azure GPT-3.5",
          description: "Azureクラウドサービスと統合されたGPT-3.5。",
        },
        {
          name: "Azure GPT-4",
          description: "Azureクラウドサービスと統合されたGPT-4。",
        },
      ],
    },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item.name);
    onItemSelect(item);
    setIsOpen(false);
  };

  return (
    <div className={styles.dropdownContainer}>
      <div className={styles.dropdownHeader} onClick={handleDropdownToggle}>
        {selectedItem !== null ? selectedItem : "GPT-3.5"}
      </div>
      {isOpen && (
        <div className={styles.dropdownList}> 
          {groups.map((group, index) => (
            <div key={index} className={styles.dropdownGroup}>
              <div className={styles.dropdownGroupTitle}>{group.title}</div>
              {group.items.map((item, index) => (
                <div
                  key={index}
                  className={styles.dropdownItem}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.dropdownItemName}>{item.name}</div>
                  <div className={styles.dropdownItemDescription}>
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
