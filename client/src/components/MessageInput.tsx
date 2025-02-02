import React, { useRef } from "react";
import { commands } from "../utils/commands";
import { socket } from "../index";

interface Props {
    message: string;
    setMessage: React.Dispatch<React.SetStateAction<string>>;
    setMessages: React.Dispatch<React.SetStateAction<string[]>>;
    currentChannel: string;
    setCurrentChannel: React.Dispatch<React.SetStateAction<string>>;
}

const MessageInput: React.FC<Props> = ({ message, setMessage, setMessages, currentChannel, setCurrentChannel }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const isTextarea = message.length > 90;

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        if (trimmedMessage.startsWith("/")) {
            const [command, ...args] = trimmedMessage.split(" ");
            if (commands[command]) {
                commands[command](args, setCurrentChannel, setMessages);
                setMessages((prev) => [...prev, `Command executed: ${command} ${args.join(" ")}`]);
            } else {
                setMessages((prev) => [...prev, `Unknown command: ${command}`]);
            }
        } else {
            socket.emit("message", { channel: currentChannel, content: trimmedMessage });
        }

        setMessage("");
    };

    return (
        <form onSubmit={handleSendMessage}>
            {isTextarea ? (
                <textarea
                    ref={textAreaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    style={{ resize: "none" }}
                />
            ) : (
                <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message or command..."
                />
            )}
            <button type="submit">Send</button>
        </form>
    );
};

export default MessageInput;
