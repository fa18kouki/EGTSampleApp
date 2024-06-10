import React, { useState } from "react";
import styles from "./Dropdown.module.css"; // 追加するスタイルシート
import { NavigationFilled} from '@fluentui/react-icons';

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

export const Dropdown: React.FC<DropdownProps> = ({ onItemSelect }) => {
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
        <NavigationFilled  className={styles.dropdownIcon} />
        {selectedItem !== null ? selectedItem : "GPT-4o"}
      </div>
      {isOpen && (
        <div className={styles.dropdownList}> 
          {groups.map((group, index) => (
            <div key={index} className={styles.dropdownGroup}>
              <div className={styles.dropdownGroupTitle}>{group.title}</div>
              {group.items.map((item, index) => (
                <div
                  //key={item.key}
                  className={styles.dropdownItemName}

                  onClick={() => handleItemClick(item)}
                >
                  {item.name}
                  <div className={styles.dropdownItemDescription}>
                    {item.description}
                  </div>
                </div >
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};