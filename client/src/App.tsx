import React, { useState, useEffect, useRef } from "react";
import { socket } from "./index";
import "./App.css";

// Ajouter cette interface en haut du fichier, après les imports
interface ChatMessage {
    nickname: string;
    content: string;
    channel: string;
    createdAt?: Date;
}

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<{[channel: string]: string[]}>({});
    const [notifications, setNotifications] = useState<{[channel: string]: string[]}>({});
    const [isTextarea, setIsTextarea] = useState(false);
    const [currentChannel, setCurrentChannel] = useState("");
    const [nickname, setNickname] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [nickError, setNickError] = useState("");
    const [isLogin, setIsLogin] = useState(false);
    const [joinedChannels, setJoinedChannels] = useState<string[]>([]);

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
            setMessages((prev) => ({
                ...prev,
                [data.channel]: Array.isArray(prev[data.channel])
                    ? [...prev[data.channel], `${data.nickname}: ${data.content}`]
                    : [`${data.nickname}: ${data.content}`]
            }));
        });

        socket.on("private_message", (data) => {
            const privateChannel = `private-${data.from}`;
            setMessages((prev) => ({
                ...prev,
                [privateChannel]: Array.isArray(prev[privateChannel])
                    ? [...prev[privateChannel], `Private from ${data.from}: ${data.content}`]
                    : [`Private from ${data.from}: ${data.content}`]
            }));
        });

        socket.on("channel_messages", (msgs: ChatMessage[]) => {
            // On reçoit un tableau de messages
            const channelMessages = msgs.map((msg: ChatMessage) => `${msg.nickname}: ${msg.content}`);
            setMessages((prev) => ({
                ...prev,
                [currentChannel]: channelMessages
            }));
        });

        socket.on("channels_list", (channels) => {
            if (channels.length > 0) {
                setMessages((prev) => ({
                    ...prev,
                    system: [
                        "Available channels:",
                        ...channels.map((c: string) => `- ${c}`)
                    ]
                }));
            } else {
                setMessages((prev) => ({
                    ...prev,
                    system: ["No channels available."]
                }));
            }
        });

        // -- Gestion d'erreur générique --
        socket.on("error", (err) => {
            setMessages((prev) => ({
                ...prev,
                system: [...(prev.system || []), `Error: ${err}`]
            }));
        });

        // Écouter les événements de channel
        socket.on("channel_created", (channelName) => {
            setJoinedChannels(prev => [...prev, channelName]);
            setCurrentChannel(channelName);
            setNotifications(prev => ({
                ...prev,
                [channelName]: Array.isArray(prev[channelName]) 
                    ? [...prev[channelName], `Channel ${channelName} created and joined successfully`]
                    : [`Channel ${channelName} created and joined successfully`]
            }));
        });

        socket.on("user_joined", (message) => {
            const channelName = message.split(" joined ")[1];
            if (!joinedChannels.includes(channelName)) {
                setJoinedChannels(prev => [...prev, channelName]);
            }
            setNotifications(prev => ({
                ...prev,
                [channelName]: Array.isArray(prev[channelName]) 
                    ? [...prev[channelName], message]
                    : [message]
            }));
        });

        socket.on("user_left", (message) => {
            const channelName = message.split(" left ")[1];
            setJoinedChannels(prev => prev.filter(ch => ch !== channelName));
            setNotifications(prev => ({
                ...prev,
                [channelName]: Array.isArray(prev[channelName]) 
                    ? [...prev[channelName], message]
                    : [message]
            }));
        });

        return () => {
            socket.off("new_message");
            socket.off("private_message");
            socket.off("channel_messages");
            socket.off("channels_list");
            socket.off("error");
            socket.off("channel_created");
            socket.off("user_joined");
            socket.off("user_left");
        };
    }, [currentChannel, joinedChannels]);

    // Écoute de la validation du nickname
    useEffect(() => {
        socket.on("nick_success", (message) => {
            const nickname = message.split(": ")[1];
            setNickname(nickname);
            setIsConnected(true);
            setNickError("");
            setNotifications(prev => ({
                ...prev,
                system: Array.isArray(prev.system) ? [...prev.system, message] : [message]
            }));
        });

        socket.on("check_nickname_success", (data) => {
            console.log('Réception check_nickname_success:', data);
            setNickname(data.nickname);
            setIsConnected(true);
            setNickError("");
            setJoinedChannels(data.channels);
            setCurrentChannel(data.currentChannel);
            setNotifications(prev => ({
                ...prev,
                system: Array.isArray(prev.system) 
                    ? [...prev.system, `Connecté en tant que ${data.nickname}`] 
                    : [`Connecté en tant que ${data.nickname}`]
            }));
        });

        socket.on("error", (error) => {
            setNickError(error);
            setIsConnected(false);
        });

        socket.on("channel_messages", (messages) => {
            console.log('Réception messages:', messages);
            if (messages.length > 0) {
                const channelName = messages[0].channel;
                const formattedMessages = messages.map(
                    (msg: ChatMessage) => `${msg.nickname}: ${msg.content}`
                );
                setMessages(prev => ({
                    ...prev,
                    [channelName]: formattedMessages
                }));
            }
        });

        return () => {
            socket.off("nick_success");
            socket.off("check_nickname_success");
            socket.off("error");
        };
    }, []);

    /**
     * Commandes disponibles (similaires à celles définies dans la version HTML)
     */
    const commands: { [key: string]: (args: string[]) => void } = {
        "/nick": (args) => socket.emit("message", { content: `/nick ${args[0]}` }),
        "/create": (args) => {
            socket.emit("message", { content: `/create ${args[0]}` });
        },
        "/list": (args) => socket.emit("message", { content: `/list ${args[0] || ""}` }),
        "/delete": (args) => socket.emit("message", { content: `/delete ${args[0]}` }),
        "/join": (args) => {
            setCurrentChannel(args[0]);
            socket.emit("message", { content: `/join ${args[0]}` });
        },
        "/quit": (args) => {
            const channelToQuit = args[0] || currentChannel;
            setJoinedChannels(prev => prev.filter(ch => ch !== channelToQuit));
            setCurrentChannel("");
            setNotifications(prev => {
                const newNotifications = { ...prev };
                delete newNotifications[channelToQuit];
                return newNotifications;
            });
            setMessages(prev => {
                const newMessages = { ...prev };
                delete newMessages[channelToQuit];
                return newMessages;
            });
            socket.emit("message", { content: `/quit ${channelToQuit}` });
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

        if (!trimmedMessage.startsWith("/") && (!currentChannel || !joinedChannels.includes(currentChannel))) {
            setMessages(prev => ({
                ...prev,
                system: [...(prev.system || []), "Error: You must first join or create a channel using /create or /join"]
            }));
            return;
        }

        if (trimmedMessage.startsWith("/")) {
            const [command, ...args] = trimmedMessage.split(" ");
            if (commands[command]) {
                commands[command](args);
            } else {
                setMessages(prev => ({
                    ...prev,
                    system: [...(prev.system || []), `Unknown command: ${command}`]
                }));
            }
        } else {
            if (!currentChannel) {
                setMessages(prev => ({
                    ...prev,
                    system: [...(prev.system || []), "Error: You must be in a channel to send messages"]
                }));
                return;
            }
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

    const handleNicknameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nick = isLogin ? message.trim() : message.trim().replace('/nick ', '');
        
        console.log('Mode:', isLogin ? 'connexion' : 'création');
        console.log('Pseudo:', nick);

        if (!nick) {
            setNickError("Le nickname ne peut pas être vide");
            return;
        }

        if (isLogin) {
            socket.emit('check_nickname', nick);
        } else {
            socket.emit('message', { content: `/nick ${nick}` });
        }
        
        const timeout = setTimeout(() => {
            if (!isConnected) {
                setNickError("Erreur de connexion : aucune réponse du serveur");
            }
        }, 5000);
        
        setMessage("");
        return () => clearTimeout(timeout);
    };

    return (
        <div className="globalAppDiv">
            <h1>Chat Application</h1>
            {!isConnected ? (
                <div className="login-container">
                    <div className="login-header">
                        <h2>{isLogin ? "Connexion" : "Créer un pseudo"}</h2>
                        <button 
                            className="toggle-login" 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setNickError("");
                                setMessage("");
                            }}
                        >
                            {isLogin ? "Créer un nouveau pseudo" : "Déjà un pseudo ?"}
                        </button>
                    </div>
                    {nickError && <p className="error">{nickError}</p>}
                    <form onSubmit={handleNicknameSubmit}>
                        <div className="nickname-input-container">
                            {!isLogin && <span className="command-prefix">/nick </span>}
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={isLogin ? "Entrez votre pseudo existant..." : "Choisissez un pseudo..."}
                                autoFocus
                                disabled={nickError !== ""}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={nickError !== ""}
                        >
                            {nickError ? "Erreur..." : (isLogin ? "Se connecter" : "Créer")}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="container">
                    {currentChannel ? (
                        <h2>Channel: {currentChannel}</h2>
                    ) : (
                        <h2 className="warning">No channel joined. Use /create or /join to start chatting</h2>
                    )}
                    <ul>
                        {[
                            ...(messages[currentChannel] || []),
                            ...(notifications[currentChannel] || []),
                            ...(notifications.system || [])
                        ].map((msg, index) => (
                            <li 
                                key={index} 
                                className={
                                    notifications[currentChannel]?.includes(msg) || 
                                    notifications.system?.includes(msg)
                                        ? 'notification' 
                                        : 'message'
                                }
                            >
                                {msg}
                            </li>
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
            )}
        </div>
    );
}

export default App;
