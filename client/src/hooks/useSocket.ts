import { useEffect, useState } from "react";
import { socket } from "../index";

interface ChatMessage {
    channel: string;
    nickname?: string;
    content: string;
}

type ChannelMessages = Record<string, ChatMessage[]>;
type Message = string;

export function useChat() {
    const [channelMessages, setChannelMessages] = useState<ChannelMessages>({});
    const [currentChannel, setCurrentChannel] = useState("general");
    const [channels, setChannels] = useState<string[]>([]);
    function addChatMessage(
        channel: string,
        nickname: string | undefined,
        content: string
    ) {
        setChannelMessages((prev) => {
            const oldList = prev[channel] || [];
            const newMessage: ChatMessage = {
                channel,
                nickname,
                content,
            };
            return {
                ...prev,
                [channel]: [...oldList, newMessage],
            };
        });
    }

    useEffect(() => {
        socket.on("new_message", (data) => {
            addChatMessage(data.channel, data.nickname, data.content);
        });

        socket.on("private_message", (data) => {
            addChatMessage("private", data.from, data.content);
        });

        socket.on("channel_messages", (msgs) => {
            if (!msgs || msgs.length === 0) return;
            const channelName = msgs[0].channel || currentChannel;

            setChannelMessages((prev) => {
                const replacedList = msgs.map((msg: any) => ({
                    channel: channelName,
                    nickname: msg.nickname,
                    content: msg.content,
                }));

                return {
                    ...prev,
                    [channelName]: replacedList,
                };
            });
        });

        socket.on("channels_list", (channelList: string[]) => {
            if (channelList.length > 0) {
                addChatMessage(
                    currentChannel,
                    "SYSTEM",
                    "Available channels:\n" + channelList.map((c) => `- ${c}`).join("\n")
                );
            } else {
                addChatMessage(currentChannel, "SYSTEM", "No channels available.");
            }
            setChannels(channelList);
        });

        socket.on("users_list", (userList) => {
            if (userList.length > 0) {
                addChatMessage(currentChannel, "SYSTEM", "Users in the channel:");
                userList.forEach((user: any) => {
                    addChatMessage(
                        currentChannel,
                        "SYSTEM",
                        `- ${user.nickname} (${user.isConnected ? "online" : "offline"})`
                    );
                });
            } else {
                addChatMessage(currentChannel, "SYSTEM", "No users in the channel.");
            }
        });

        socket.on("error", (err) => {
            addChatMessage(currentChannel, "SYSTEM", `Error: ${err}`);
        });

        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("users_list");
            socket.off("error");
        };
    }, [currentChannel]);

    function sendMessage(content: string, channelOverride?: string) {
        const channel = channelOverride ?? currentChannel;
        socket.emit("message", {
            channel,
            content,
        });
    }

    function executeCommand(commandLine: string) {
        socket.emit("message", { content: commandLine });
    }

    const messagesForCurrentChannel = channelMessages[currentChannel] || [];
    const messagesAsStrings: string[] = messagesForCurrentChannel.map((msg) => {
        if (msg.nickname && msg.nickname !== "SYSTEM") {
            return `${msg.nickname}: ${msg.content}`;
        } else if (msg.nickname === "SYSTEM") {
            return `[SYSTEM] ${msg.content}`;
        } else {
            return msg.content;
        }
    });

    return {
        messages: messagesAsStrings,
        sendMessage,
        executeCommand,
        currentChannel,
        setCurrentChannel,
        channels,
    };
}