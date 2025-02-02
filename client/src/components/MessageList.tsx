import React from "react";

interface MessageListProps {
    messages: string[];
}

export function MessageList({ messages }: MessageListProps) {
    return (
        <ul>
            {messages.map((msg, index) => (
                <li key={index}>{msg}</li>
            ))}
        </ul>
    );
}
