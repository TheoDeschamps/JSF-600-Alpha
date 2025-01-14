import mongoose, { Schema } from 'mongoose';
// Définition du schéma Mongoose
const messageSchema = new Schema({
    //client_offset: { type: String, unique: true }, // Unique pour éviter les doublons
    content: { type: String, required: true }, // Requis : contenu du message
    channel: { type: String, required: true }, // Requis : channel
    nickname: { type: String, required: true }, // Requis : pseudo
    createdAt: { type: Date, default: Date.now }, // Par défaut : date actuelle
});
// Vérification et définition du modèle
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
