interface CommandMap {
    [key: string]: (args: string[]) => void;
}

export function createCommands(
    executeCommand: (commandLine: string) => void,
    setCurrentChannel: (channel: string) => void,
    addMessage: (msg: string) => void,
    currentChannel: string
): CommandMap {

    return {
        "/nick": (args) => {
            executeCommand(`/nick ${args[0]}`);
            addMessage(`Command executed: /nick ${args[0]}`);
        },
        "/create": (args) => {
            executeCommand(`/create ${args[0]}`);
            addMessage(`Command executed: /create ${args[0]}`);
        },
        "/list": (args) => {
            executeCommand(`/list ${args[0] || ""}`);
            addMessage(`Command executed: /list ${args.join(" ")}`);
        },
        "/delete": (args) => {
            executeCommand(`/delete ${args[0]}`);
            addMessage(`Command executed: /delete ${args[0]}`);
        },
        "/join": (args) => {
            setCurrentChannel(args[0]);
            executeCommand(`/join ${args[0]}`);
            addMessage(`Command executed: /join ${args[0]}`);
        },
        "/quit": (args) => {
            setCurrentChannel("general");
            executeCommand(`/quit ${args[0]}`);
            addMessage(`Command executed: /quit ${args[0]}`);
        },
        "/users": (args) => {
            executeCommand(`/users ${args[0] || currentChannel}`);
            addMessage(`Command executed: /users ${args[0] || currentChannel}`);
        },
        "/msg": (args) => {
            const [toNickname, ...rest] = args;
            const content = rest.join(" ");
            executeCommand(`/msg ${toNickname} ${content}`);
            addMessage(`Command executed: /msg ${toNickname} ${content}`);
        },
        "/rename": (args) => {
            if (args.length < 2) {
                addMessage("Usage: /rename <oldChannelName> <newChannelName>");
                return;
            }
            executeCommand(`/rename ${args[0]} ${args[1]}`);
            addMessage(`Command executed: /rename ${args[0]} ${args[1]}`);
        },
    };
}
