import { useState } from "react";
import { Stack, IconButton } from "@fluentui/react";
import { SendRegular, SendFilled, AttachFilled, DismissSquareFilled, DismissSquareRegular } from "@fluentui/react-icons";
import styles from "./QuestionInput.module.css";

interface Props {
  onSend: (question: string, files?: File[] | null, id?: string) => void;
  disabled: boolean;
  placeholder?: string;
  clearOnSend?: boolean;
  conversationId?: string;
}

export const QuestionInput = ({
  onSend,
  disabled,
  placeholder,
  clearOnSend,
  conversationId,
}: Props) => {
  const [question, setQuestion] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  const sendQuestion = () => {
    if (disabled || (!question.trim() && files.length === 0)) {
      return;
    }

    if (conversationId) {
      onSend(question, files, conversationId);
    } else {
      onSend(question, files);
    }

    if (clearOnSend) {
      setQuestion("");
      setFiles([]);
    }
  };

  const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
    if (
      ev.key === "Enter" &&
      !ev.shiftKey &&
      !(ev.nativeEvent?.isComposing === true)
    ) {
      ev.preventDefault();
      sendQuestion();
    }
  };

  const onQuestionChange = (
    _ev: React.FormEvent<HTMLTextAreaElement>,
    newValue?: string
  ) => {
    setQuestion(newValue || "");
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files ? Array.from(event.target.files) : [];
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const sendQuestionDisabled = disabled || (!question.trim() && files.length === 0);

  return (
    <Stack
      horizontal
      className="w-full relative max-h-80 min-h-32 bg-white shadow-lg rounded-lg"
    >
      <div className="w-full flex flex-col">
        <div className="flex flex-wrap p-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center text-sm text-gray-600 truncate max-w-xs mr-2">
              {file.name}
              <DismissSquareFilled
                onClick={() => removeFile(index)}
                className="cursor-pointer"
                style={{ fontSize: '20px' }}
              />
              {/*
              <IconButton
                iconProps={{ iconName: 'DismissCircleFilled' }}
                title="Remove file"
                ariaLabel="Remove file"
                onClick={() => removeFile(index)}
                className="ml-2"
              />
              */}
            </div>
          ))}
        </div>
        <textarea
          className="w-full mb-2 mx-3 leading-6 border-none resize-none overflow-auto"
          placeholder={placeholder}
          value={question}
          onChange={(e) => {
            onQuestionChange(e, e.target.value);
            e.target.style.height = 'auto'; 
            e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 128), 304)}px`; 
          }}
          onKeyDown={onEnterPress}
          disabled={disabled}
          style={{ overflowY: 'auto', minHeight: '128px', maxHeight: '320px' }}
        />
      </div>
      <div className="w-1/10 flex flex-col items-center justify-center">
        <input
          type="file"
          onChange={onFileChange}
          disabled={disabled}
          className="hidden"
          id="file-upload"
          multiple
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer mb-2"
        >
          <span className="text-sm text-gray-600">📎</span>
        </label>
        <div
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Ask question button"
          onClick={sendQuestion}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? sendQuestion() : null
          }
        >
          {sendQuestionDisabled ? <SendRegular style={{ fontSize: '24px' }} /> : <SendFilled style={{ fontSize: '24px' }} />}
        </div>
      </div>
      <div className="absolute w-full h-1 left-0 bottom-0 bg-gradient-to-r from-black to-white rounded-b-lg" />
    </Stack>
  );
};