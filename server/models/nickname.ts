import mongoose, { Schema, Document } from 'mongoose';

// Interface TypeScript pour un nickname
export interface INickname extends Document {
    socketId: string;
    nickname: string;
}

// Schéma pour les nicknames
const nicknameSchema = new Schema<INickname>({
    socketId: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
});

// Modèle Mongoose
const Nickname = mongoose.models.Nickname || mongoose.model<INickname>('Nickname', nicknameSchema);

export default Nickname;
