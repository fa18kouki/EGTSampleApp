import * as React from "react";
import {
    makeStyles,
    shorthands,
    Button,
    Caption1,
    Text,
    tokens,
    Subtitle1,
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogContent,
    DialogActions
} from "@fluentui/react-components";
import { MoreHorizontal20Regular, DismissCircle32Filled, Clipboard32Regular } from "@fluentui/react-icons";
import { Card, CardHeader, CardPreview } from "@fluentui/react-components";

const resolveAsset = (asset: string) => {
    const ASSET_URL = "https://raw.githubusercontent.com/microsoft/fluentui/master/packages/react-components/react-card/stories/assets/";
    return `${ASSET_URL}${asset}`;
};

const useStyles = makeStyles({
    main: {
        ...shorthands.gap("36px"),
        display: "flex",
        flexDirection: "column",
        flexWrap: "wrap"
    },
    card: {
        width: "360px",
        maxWidth: "100%",
        height: "100px"
    },
    section: {
        width: "fit-content"
    },
    title: {
        ...shorthands.margin(0, 0, "12px"),
        color: "rgba(100, 100, 100, 0.87)"
    },
    horizontalCardImage: {
        width: "64px",
        height: "64px"
    },
    headerImage: {
        ...shorthands.borderRadius("4px"),
        maxWidth: "44px",
        maxHeight: "44px"
    },
    caption: {
        color: tokens.colorNeutralForeground3
    },
    text: {
        ...shorthands.margin(0)
    },
    modal: {
        ...shorthands.borderRadius("8px"),
        backgroundColor: "#fff",
        width: "500px",
        maxWidth: "80%",
        maxHeight: "80%"
    },
    modalText: {
        color: "#000",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
    },
    modalClose: {
        position: "absolute",
        right: "5px",
        top: "5px",
        cursor: "pointer",
        ":hover": {
            backgroundColor: "#f4f4f4"
        },
        ":active": {
            backgroundColor: "#e0e0e0"
        }
    },
    modalCopy: {
        position: "absolute",
        right: "10px",
        bottom: "10px",
        // ホバー時のスタイル
        ":hover": {
            backgroundColor: "#f4f4f4"
        },
        // クリック（active）時のスタイル
        ":active": {
            backgroundColor: "#e0e0e0"
        }
    }
});

interface PromptCardProps {
    name: string;
    documentTitle: string;
    documentContent: string;
}

export const PromptCard = ({ name, documentTitle, documentContent }: PromptCardProps) => {
    const styles = useStyles();
    const [isDetailVisible, setIsDetailVisible] = React.useState(false);

    const toggleDetailVisibility = () => {
        setIsDetailVisible(!isDetailVisible);
    };

    return (
        <>
            <div className={styles.main}>
                <section className={styles.section}>
                    <Card className={styles.card} onClick={toggleDetailVisibility}>
                        <CardHeader
                            image={<img className={styles.headerImage} src={resolveAsset("app_logo.svg")} alt="App Name Document" />}
                            header={
                                <Text weight="semibold" className={styles.title}>
                                    {name}
                                </Text>
                            }
                            description={<Caption1 className={styles.caption}>{documentTitle}</Caption1>}
                        />
                    </Card>
                </section>
            </div>
            <PromptDetail isOpen={isDetailVisible} onClose={toggleDetailVisibility} content={documentContent} />
        </>
    );
};

interface PromptDetailProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

const PromptDetail = ({ isOpen, onClose, content }: PromptDetailProps) => {
    const styles = useStyles();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(content).then(
            () => {
                // コピー成功時の処理をここに書く
                console.log("コンテンツをクリップボードにコピーしました。");
            },
            err => {
                // コピー失敗時の処理をここに書く
                console.error("クリップボードへのコピーに失敗しました。", err);
            }
        );
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogSurface className={styles.modal}>
                <DialogBody>
                    <DialogContent>
                        <Text className={styles.modalText}>{content}</Text>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="primary" onClick={copyToClipboard}>
                            <Clipboard32Regular   className={styles.modalCopy}/>
                        </Button>
                        <Button appearance="primary" onClick={onClose}>
                            <DismissCircle32Filled className={styles.modalClose}/>
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};
