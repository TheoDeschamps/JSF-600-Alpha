import React, {useEffect, useState} from "react";
import { useChat } from "./hooks/useSocket";
import { createCommands } from "./utils/commands";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { ChannelList } from "./components/ChannelList";
import "./App.css";

function App() {
    
    const {
        messages,
        sendMessage,
        executeCommand,
        currentChannel,
        setCurrentChannel,
        channels,
    } = useChat();

    const [message, setMessage] = useState("");
    const [isTextarea, setIsTextarea] = useState(false);

    const commands = createCommands(
        executeCommand,
        setCurrentChannel,
        (newMsg: string) => {
            sendMessage(`(info) ${newMsg}`);
        },
        currentChannel,
        sendMessage
    );

    useEffect(() => {
        handleSendMessage("/list");
    }, []);

    function handleJoinChannel(channel: string) {
        const cmdLine = `/join ${channel}`;
        const [command, ...args] = cmdLine.split(" ");
        if (commands[command]) {
            commands[command](args);
        } else {
            sendMessage(`Unknown command: ${command}`);
        }
    }

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
            <div className="container" style={{ display: "flex" }}>
                <div style={{ marginRight: "20px", width: "200px" }}>
                    <ChannelList channels={channels} onJoinChannel={handleJoinChannel} />
                </div>
                <div style={{ flex: 1 }}>
                    <MessageList messages={messages} />

                    <MessageInput
                        message={message}
                        onMessageChange={handleTextareaToggle}
                        isTextarea={isTextarea}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
