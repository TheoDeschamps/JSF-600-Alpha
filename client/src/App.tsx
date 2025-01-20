import React, { useEffect, useState } from "react";
import { socket } from "./index";

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<string[]>([]);

    // Récupérer les messages existants et écouter les nouveaux messages
    useEffect(() => {
        // Recevoir tous les messages existants
        socket.on("messages", (msgs) => {
            setMessages(msgs.map((msg: any) => msg.message)); // Extraire uniquement `message`
        });

        // Écouter les nouveaux messages en temps réel
        socket.on("chat message", (newMessage) => {
            setMessages((prevMessages) => [...prevMessages, newMessage.message]); // Ajouter le nouveau message
        });

        // Nettoyer les écouteurs lors du démontage du composant
        return () => {
            socket.off("messages");
            socket.off("chat message");
        };
    }, []);

    const sendMessage = () => {
        if (message.trim()) {
            socket.emit('chat message', { message }); // Envoyer un objet avec `message`
            setMessage(''); // Réinitialiser le champ de saisie
        }
    };

    return (
        <div>
            <h1>Chat Application</h1>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
            <ul>
                {messages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                ))}
            </ul>
        </div>
    );
}

export default App;
