import mongoose, { Schema, Document } from 'mongoose';

// Interface TypeScript pour un channel
export interface IChannel extends Document {
    name: string;
    createdAt: Date;
    users: string[];
    rename : string;
}

// Schéma pour les channels
const channelSchema = new Schema<IChannel>({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    users: { type: [String], default: [] },
    rename: { type: String, default: '' },
});

// Modèle Mongoose
const Channel = mongoose.models.Channel || mongoose.model<IChannel>('Channel', channelSchema);

export default Channel;