import React, { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import "./App.css";

function App() {
    const [messages, setMessages] = useState<string[]>([]);
    const [message, setMessage] = useState("");
    const [currentChannel, setCurrentChannel] = useState("general");

    useSocket(setMessages, setCurrentChannel);

    return (
        <div className="globalAppDiv">
            <h1>Chat Application</h1>
            <div className="container">
                <MessageList messages={messages} />
                <MessageInput message={message} setMessage={setMessage} setMessages={setMessages} currentChannel={currentChannel} setCurrentChannel={setCurrentChannel} />
            </div>
        </div>
    );
}

export default App;
