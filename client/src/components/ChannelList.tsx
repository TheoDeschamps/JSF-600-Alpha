import React from "react";

interface ChannelListProps {
    channels: string[];
    onJoinChannel: (channelName: string) => void;
}

export function ChannelList({ channels, onJoinChannel }: ChannelListProps) {
    if (!channels || channels.length === 0) {
        return <div>No channels available.</div>;
    }

    return (
        <div>
            <h2>Channels</h2>
            <ul>
                {channels.map((channel) => (
                    <li key={channel} style={{ marginBottom: "8px" }}>
                        {channel}{" "}
                        <button onClick={() => onJoinChannel(channel)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
