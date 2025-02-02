interface CommandMap {
    [key: string]: (args: string[]) => void;
}

export function createCommands(
    executeCommand: (commandLine: string) => void,
    setCurrentChannel: (channel: string) => void,
    addMessage: (msg: string) => void,
    currentChannel: string,
    sendMessage: (content: string, channelOverride?: string) => void
):
    CommandMap {

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
            const channelName = args[0];
            if (!channelName) {
                addMessage("Usage: /join <channelName>");
                return;
            }
            setCurrentChannel(channelName);
            executeCommand(`/join ${channelName}`);
            sendMessage(`il nous a rejoint dans le channel ${channelName}`, channelName);
        },
        "/quit": (args) => {
            const channelName = args[0] || currentChannel;
            sendMessage(`il a quitté le channel >${channelName}`, channelName);
            setCurrentChannel("general");
            executeCommand(`/quit ${channelName}`);
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