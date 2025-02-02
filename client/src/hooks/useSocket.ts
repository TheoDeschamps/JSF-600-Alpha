import { useEffect, useState } from "react";
import { socket } from "../index";

type Message = string;

interface UseChatReturn {
    messages: Message[];
    sendMessage: (message: string) => void;
    executeCommand: (commandLine: string) => void;
    currentChannel: string;
    setCurrentChannel: React.Dispatch<React.SetStateAction<string>>;
}

export function useChat(): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChannel, setCurrentChannel] = useState("general");

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
                    ...channels.map((c: string) => `- ${c}`)
                ]);
            } else {
                setMessages((prev) => [...prev, "No channels available."]);
            }
        });

        socket.on("users_list", (userList) => {
            if (userList.length > 0) {
                setMessages((prev) => [...prev, "Users in the channel:"]);
                userList.forEach((user: any) => {
                    setMessages((prev) => [
                        ...prev,
                        `- ${user.nickname} (${user.isConnected ? "online" : "offline"})`
                    ]);
                });
            } else {
                setMessages((prev) => [...prev, "No users in the channel."]);
            }
        });

        socket.on("error", (err) => {
            setMessages((prev) => [...prev, `Error: ${err}`]);
        });

        // Nettoyage
        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("users_list");
            socket.off("error");
        };
    }, []);

    function sendMessage(content: string) {
        socket.emit("message", {
            channel: currentChannel,
            content,
        });
    }

    function executeCommand(commandLine: string) {
        socket.emit("message", { content: commandLine });
    }

    return {
        messages,
        sendMessage,
        executeCommand,
        currentChannel,
        setCurrentChannel
    };
}
