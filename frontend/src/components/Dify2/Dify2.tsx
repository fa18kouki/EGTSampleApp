import React, { useState, useEffect, useContext } from "react";
import {
  CommandBarButton,
  IconButton,
  Dialog,
  DialogType,
  Stack,
  Panel,
  DefaultButton,
  Spinner,
} from "@fluentui/react";
import { Navigate } from "react-router-dom";
import { AppStateContext } from "../../state/AppProvider";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../../FirebaseConfig";

const Dify2Chatbot = () => {
  const appStateContext = useContext(AppStateContext);
  const user = appStateContext?.state.user;
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex flex-col gap-5 flex-1" role="main">
      <Stack horizontal className="flex flex-1 mt-0 mb-5 mx-5 gap-1">
        <div className="flex flex-col items-center flex-1 bg-gradient-to-b from-white to-gray-400 shadow-md rounded-lg overflow-y-auto max-h-[calc(100vh-100px)]">
          {loading && <Spinner label="読み込み中..." />}
          <iframe
            src="https://udify.app/chatbot/aGrhD2c0BKfW7qq8"
            style={{ width: "100%", height: "100%" }}
            frameBorder="0"
            allow="microphone"
            onLoad={handleLoad}
          ></iframe>
        </div>
      </Stack>
    </div>
  );
};

export default Dify2Chatbot;