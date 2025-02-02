import { useEffect, useState } from "react";
import { socket } from "../index";

export function useSocket(setMessages: React.Dispatch<React.SetStateAction<string[]>>, setCurrentChannel: React.Dispatch<React.SetStateAction<string>>) {
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
            setMessages((prev) => [
                ...prev,
                channels.length > 0 ? "Available channels:" : "No channels available.",
                ...channels.map((c: string) => `- ${c}`)
            ]);
        });

        socket.on("users_list", (userList) => {
            setMessages((prev) => [
                ...prev,
                userList.length > 0 ? "Users in the channel:" : "No users in the channel.",
                ...userList.map((user: any) => `- ${user.nickname} (${user.isConnected ? "online" : "offline"})`)
            ]);
        });

        socket.on("error", (err) => {
            setMessages((prev) => [...prev, `Error: ${err}`]);
        });

        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("users_list");
            socket.off("error");
        };
    }, []);
}
