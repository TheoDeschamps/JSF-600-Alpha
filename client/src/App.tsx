import React, { useState, useEffect, useRef } from "react";
import { socket } from "./index";
import './App.css';

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const [isTextarea, setIsTextarea] = useState(false);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isTextarea) {
            textAreaRef.current?.focus();
            const length = message.length;
            textAreaRef.current?.setSelectionRange(length, length);
        } else {
            inputRef.current?.focus();
            const length = message.length;
            inputRef.current?.setSelectionRange(length, length);
        }
    }, [isTextarea, message]);

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
                            ref={textAreaRef}
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={3}
                            placeholder="Type a message..."
                        />
                    ) : (
                        <input
                            ref={inputRef}
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
