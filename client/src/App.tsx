import React, {useEffect, useState} from "react";
import {socket} from "./index";
import './App.css';

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<string[]>([]);

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

    const sendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (message.trim()) {
            socket.emit('chat message', { message });
            setMessage('');
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
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default App;
