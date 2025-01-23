import React, { useState, useEffect, useRef } from "react";
import { socket } from "./index";
import "./App.css";

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const [isTextarea, setIsTextarea] = useState(false);
    const [currentChannel, setCurrentChannel] = useState("general");

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
        socket.on("new_message", (data) => {
            setMessages((prev) => [...prev, `${data.nickname}: ${data.content}`]);
        });

        socket.on("private_message", (data) => {
            setMessages((prev) => [...prev, `Private from ${data.from}: ${data.content}`]);
        });

        socket.on("channel_messages", (msgs) => {
            msgs.forEach((msg: any) => {
                setMessages((prev) => [...prev, `${msg.nickname}: ${msg.content}`]);
            });
        });

        socket.on("channels_list", (channels) => {
            if (channels.length > 0) {
                setMessages((prev) => [
                    ...prev,
                    "Available channels:",
                    ...channels.map((c: string) => `- ${c}`),
                ]);
            } else {
                setMessages((prev) => [...prev, "No channels available."]);
            }
        });

        socket.on("error", (err) => {
            setMessages((prev) => [...prev, `Error: ${err}`]);
        });

        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("error");
        };
    }, []);

    const commands: { [key: string]: (args: string[]) => void } = {
        "/nick": (args) => socket.emit("message", { content: `/nick ${args[0]}` }),
        "/create": (args) => socket.emit("message", { content: `/create ${args[0]}` }),
        "/list": (args) => socket.emit("message", { content: `/list ${args[0] || ""}` }),
        "/delete": (args) => socket.emit("message", { content: `/delete ${args[0]}` }),
        "/join": (args) => {
            setCurrentChannel(args[0]);
            socket.emit("message", { content: `/join ${args[0]}` });
        },
        "/quit": (args) => {
            setCurrentChannel("general");
            socket.emit("message", { content: `/quit ${args[0]}` });
        },
        "/users": (args) => {
            socket.emit("message", { content: `/users ${args[0] || currentChannel}` });
        },
        "/msg": (args) => {
            const [toNickname, ...rest] = args;
            socket.emit("message", { content: `/msg ${toNickname} ${rest.join(" ")}` });
        },
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const inputValue = e.target.value;
        setMessage(inputValue);

        if (inputValue.length > 90) {
            setIsTextarea(true);
        } else {
            setIsTextarea(false);
        }
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        if (trimmedMessage.startsWith("/")) {
            const [command, ...args] = trimmedMessage.split(" ");
            if (commands[command]) {
                commands[command](args);
                setMessages((prev) => [
                    ...prev,
                    `Command executed: ${command} ${args.join(" ")}`
                ]);
            } else {
                setMessages((prev) => [...prev, `Unknown command: ${command}`]);
            }
        } else {
            socket.emit("message", {
                channel: currentChannel,
                content: trimmedMessage,
            });
        }

        setMessage("");
        setIsTextarea(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="globalAppDiv">
            <h1>Chat Application</h1>
            <div className="container">
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>

                <form className="messageSendDiv" onSubmit={handleSendMessage}>
                    {isTextarea ? (
                        <textarea
                            ref={textAreaRef}
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={3}
                            placeholder="Type a message or command..."
                        />
                    ) : (
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={handleInputChange}
                            placeholder="Type a message or command..."
                        />
                    )}
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}
export default App;