import mongoose, { Schema, Document } from 'mongoose';

// Interface TypeScript pour un nickname
export interface INickname extends Document {
    socketId: string;
    nickname: string;
    channels : string[];
    isConnected: boolean;
    lastDisconnect: Date | null;
    createdAt: Date;
    lastLogin: Date;
}

// Schéma pour les nicknames
const nicknameSchema = new Schema<INickname>({
    socketId: { type: String, required: true, unique: true },
    nickname: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    channels : { type: [String],  required : true },
    isConnected: {
        type: Boolean,
        default: false
    },
    lastDisconnect: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

// Mettre à jour lastLogin à chaque connexion
nicknameSchema.pre('findOneAndUpdate', function(next) {
    this.set({ lastLogin: new Date() });
    next();
});

// Modèle Mongoose
const Nickname = mongoose.models.Nickname || mongoose.model<INickname>('Nickname', nicknameSchema);

export default Nickname;
