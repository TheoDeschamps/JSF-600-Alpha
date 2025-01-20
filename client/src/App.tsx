import React, {useEffect, useState} from "react";
import {socket} from "./index";
import './App.css';

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

    const sendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault(); // Empêcher le rechargement de la page
        if (message.trim()) {
            socket.emit('chat message', { message }); // Envoyer un objet avec `message`
            setMessage(''); // Réinitialiser le champ de saisie
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
