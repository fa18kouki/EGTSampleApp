import { useState } from "react";
import { Stack, TextField } from "@fluentui/react";
import { SendRegular, SendFilled } from "@fluentui/react-icons";
import styles from "./QuestionInput.module.css";

interface Props {
    onSend: (question: string, file: File | null, id?: string) => void;
    disabled: boolean;
    placeholder?: string;
    clearOnSend?: boolean;
    conversationId?: string;
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
    const [question, setQuestion] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);

    const sendQuestion = () => {
        if (disabled || (!question.trim() && !file)) {
            return;
        }

        if (conversationId) {
            onSend(question, file, conversationId);
        } else {
            onSend(question, file);
        }

        if (clearOnSend) {
            setQuestion("");
            setFile(null);
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setQuestion(newValue || "");
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        setFile(file);
    };

    const sendQuestionDisabled = disabled || (!question.trim() && !file);

    return (
        <Stack horizontal className={styles.questionInputContainer}>
            <TextField
                className={styles.questionInputTextArea}
                placeholder={placeholder}
                multiline
                resizable={false}
                borderless
                //autoAdjustHeight
                value={question}
                onChange={onQuestionChange}
                onKeyDown={onEnterPress}
            />
            <input
                type="file"
                onChange={onFileChange}
                disabled={disabled}
                className={styles.fileInput}
            />
            <div className={styles.questionInputSendButtonContainer} 
                role="button" 
                tabIndex={0}
                aria-label="Ask question button"
                onClick={sendQuestion}
                onKeyDown={e => e.key === "Enter" || e.key === " " ? sendQuestion() : null}
            >
                { sendQuestionDisabled ? 
                    <SendRegular />
                    :
                    <SendFilled />
                }
            </div>
            <div className={styles.questionInputBottomBorder} />
        </Stack>
    );
};
