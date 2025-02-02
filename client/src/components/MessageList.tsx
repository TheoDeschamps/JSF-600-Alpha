import React from "react";

interface Props {
    messages: string[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
    return (
        <ul>
            {messages.map((msg, index) => (
                <li key={index}>{msg}</li>
            ))}
        </ul>
    );
};

export default MessageList;
