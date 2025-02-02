import { socket } from "../index";

export const commands: { [key: string]: (args: string[], setCurrentChannel: React.Dispatch<React.SetStateAction<string>>, setMessages: React.Dispatch<React.SetStateAction<string[]>>) => void } = {
    "/nick": (args) => socket.emit("message", { content: `/nick ${args[0]}` }),
    "/create": (args) => socket.emit("message", { content: `/create ${args[0]}` }),
    "/list": (args) => socket.emit("message", { content: `/list ${args[0] || ""}` }),
    "/delete": (args) => socket.emit("message", { content: `/delete ${args[0]}` }),
    "/join": (args, setCurrentChannel) => {
        setCurrentChannel(args[0]);
        socket.emit("message", { content: `/join ${args[0]}` });
    },
    "/quit": (args, setCurrentChannel) => {
        setCurrentChannel("general");
        socket.emit("message", { content: `/quit ${args[0]}` });
    },
    "/users": (args, _, setMessages) => {
        socket.emit("message", { content: `/users ${args[0]}` });
    },
    "/msg": (args) => {
        const [toNickname, ...rest] = args;
        socket.emit("message", { content: `/msg ${toNickname} ${rest.join(" ")}` });
    },
    "/rename": (args, _, setMessages) => {
        if (args.length < 2) {
            setMessages((prev) => [...prev, "Usage: /rename <oldChannelName> <newChannelName>"]);
            return;
        }
        socket.emit("message", { content: `/rename ${args[0]} ${args[1]}` });
    }
};