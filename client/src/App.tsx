import React, { useState } from "react";
import { useChat } from "./hooks/useSocket";
import { createCommands } from "./utils/commands";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import "./App.css";

function App() {
    
    const {
        messages,
        sendMessage,
        executeCommand,
        currentChannel,
        setCurrentChannel,
    } = useChat();

    const [message, setMessage] = useState("");
    const [isTextarea, setIsTextarea] = useState(false);

    const commands = createCommands(
        executeCommand,
        setCurrentChannel,
        (newMsg: string) => {
            sendMessage(`(info) ${newMsg}`);
        },
        currentChannel
    );

    
    const handleSendMessage = (text: string) => {
        
        if (text.startsWith("/")) {
            const [command, ...args] = text.split(" ");
            if (commands[command]) {
                commands[command](args);
            } else {
                
                sendMessage(`Unknown command: ${command}`);
            }
        } else {
            
            sendMessage(text);
        }
        setIsTextarea(false);
    };

    const handleTextareaToggle = (newMessage: string) => {
        setMessage(newMessage);

        if (newMessage.length > 90) {
            setIsTextarea(true);
        } else {
            setIsTextarea(false);
        }
    };


    return (
        <div className="globalAppDiv">
            <h1>Chat Application</h1>
            <div className="container">
                <MessageList messages={messages} />

                <MessageInput
                    message={message}
                    onMessageChange={handleTextareaToggle}
                    isTextarea={isTextarea}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </div>
    );
}

export default App;
