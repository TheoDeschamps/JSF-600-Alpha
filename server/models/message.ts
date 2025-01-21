import mongoose, { Schema, Document } from 'mongoose';

// Interface TypeScript pour un message
export interface IMessage extends Document {
    client_offset?: string;  // Décalage client (optionnel)
    content: string;         // Contenu du message
    channel?: string;        // Channel associé au message
    nickname: string;        // Pseudo de l'utilisateur
    recipient?: string;      // Destinataire pour les messages privés
    createdAt: Date;         // Date de création du message
}

// Définition du schéma Mongoose
const messageSchema = new Schema<IMessage>({
    content: { type: String, required: true },    // Requis : contenu du message
    channel: { type: String },                   // Optionnel : channel
    nickname: { type: String, required: true },  // Requis : pseudo
    recipient: { type: String },                 // Optionnel : destinataire
    createdAt: { type: Date, default: Date.now } // Par défaut : date actuelle
});

// Vérification et définition du modèle
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

export default Message;
