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

    /**
     * Gestion de l'autofocus & du curseur de fin de texte
     * lors du basculement input <-> textarea
     */
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

    /**
     * Écoute des événements socket côté client
     * pour mettre à jour la liste des messages reçus.
     */
    useEffect(() => {
        // -- Nouveaux events envoyés par le serveur (par le code HTML de ton collègue) --
        socket.on("new_message", (data) => {
            setMessages((prev) => [...prev, `${data.nickname}: ${data.content}`]);
        });

        socket.on("private_message", (data) => {
            setMessages((prev) => [...prev, `Private from ${data.from}: ${data.content}`]);
        });

        socket.on("channel_messages", (msgs) => {
            // On reçoit un tableau de messages
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

        // -- Gestion d'erreur générique --
        socket.on("error", (err) => {
            setMessages((prev) => [...prev, `Error: ${err}`]);
        });

        /**
         * Si dans le back tu as encore besoin des anciens events
         * ('messages' / 'chat message'), tu peux les réactiver ici:
         *
         * socket.on("messages", (msgs) => {
         *   setMessages(msgs.map((msg: any) => msg.message));
         * });
         *
         * socket.on("chat message", (newMessage) => {
         *   setMessages((prevMessages) => [...prevMessages, newMessage.message]);
         * });
         */

        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("error");

            // socket.off("messages");
            // socket.off("chat message");
        };
    }, []);

    /**
     * Commandes disponibles (similaires à celles définies dans la version HTML)
     */
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

    /**
     * Fonction qui gère le changement d'input/textarea
     * (et le basculement vers un textarea si > 90 caractères)
     */
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

    /**
     * Envoi d'un message OU exécution d'une commande
     */
    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        // Si le message commence par '/', on interprète comme commande
        if (trimmedMessage.startsWith("/")) {
            const [command, ...args] = trimmedMessage.split(" ");
            if (commands[command]) {
                commands[command](args);
                // Affiche un feedback dans la liste (optionnel)
                setMessages((prev) => [
                    ...prev,
                    `Command executed: ${command} ${args.join(" ")}`
                ]);
            } else {
                setMessages((prev) => [...prev, `Unknown command: ${command}`]);
            }
        } else {
            // Sinon on envoie un message normal (au channel courant)
            socket.emit("message", {
                channel: currentChannel,
                content: trimmedMessage,
            });
        }

        setMessage("");
        setIsTextarea(false);
    };

    /**
     * Gestion de la touche "Enter + Shift" pour envoyer
     * (inversé par rapport à d'autres applis, mais conforme à ton code initial)
     */
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
