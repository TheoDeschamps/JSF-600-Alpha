import mongoose, { Schema, Document } from 'mongoose';

// Interface TypeScript pour un message
export interface IMessage extends Document {
    client_offset?: string;  // Décalage client (optionnel)
    content: string;         // Contenu du message
    channel: string;         // Channel associé au message
    nickname: string;        // Pseudo de l'utilisateur
    createdAt: Date;         // Date de création du message
}

// Définition du schéma Mongoose
const messageSchema = new Schema<IMessage>({
    //client_offset: { type: String, unique: true }, // Unique pour éviter les doublons
    content: { type: String, required: true },    // Requis : contenu du message
    channel: { type: String, required: true },    // Requis : channel
    nickname: { type: String, required: true },   // Requis : pseudo
    createdAt: { type: Date, default: Date.now }, // Par défaut : date actuelle
});

// Vérification et définition du modèle
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

export default Message;
