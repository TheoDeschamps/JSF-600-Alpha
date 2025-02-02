import React, { useRef, useEffect } from "react";

interface MessageInputProps {
    message: string;
    onMessageChange: (newMessage: string) => void;
    isTextarea: boolean;
    onSendMessage: (message: string) => void;
}

export function MessageInput({
                                 message,
                                 onMessageChange,
                                 isTextarea,
                                 onSendMessage
                             }: MessageInputProps) {

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isTextarea) {
            textAreaRef.current?.focus();
            textAreaRef.current?.setSelectionRange(message.length, message.length);
        } else {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(message.length, message.length);
        }
    }, [isTextarea, message]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onMessageChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = message.trim();
        if (trimmed === "") return;

        onSendMessage(trimmed);
        onMessageChange("");
    };

    return (
        <form onSubmit={handleSendMessage}>
            {isTextarea ? (
                <textarea
                    ref={textAreaRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    style={{ resize: "none" }}
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
    );
}
