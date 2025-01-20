import React, { useState, useEffect } from "react";
import { socket } from "./index";
import './App.css';

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const [isTextarea, setIsTextarea] = useState(false);

    useEffect(() => {
        socket.on("messages", (msgs) => {
            setMessages(msgs.map((msg: any) => msg.message));
        });

        socket.on("chat message", (newMessage) => {
            setMessages((prevMessages) => [...prevMessages, newMessage.message]);
        });

        return () => {
            socket.off("messages");
            socket.off("chat message");
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const inputValue = e.target.value;
        setMessage(inputValue);

        if (inputValue.length > 90) {
            setIsTextarea(true);
        } else {
            setIsTextarea(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (message.trim()) {
            socket.emit('chat message', { message });
            setMessage('');
            setIsTextarea(false);
        }
    };

    return (
        <div className={"globalAppDiv"}>
            <h1>Chat Application</h1>
            <div className={'container'}>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
                <form className={"messageSendDiv"} onSubmit={sendMessage}>
                    {isTextarea ? (
                        <textarea
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={3}
                            style={{ resize: "none" }}
                        />
                    ) : (
                        <input
                            type="text"
                            value={message}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                        />
                    )}
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default App;
