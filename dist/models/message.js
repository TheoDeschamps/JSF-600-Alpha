import mongoose, { Schema } from 'mongoose';
// Définition du schéma Mongoose
const messageSchema = new Schema({
    content: { type: String, required: true }, // Requis : contenu du message
    channel: { type: String }, // Optionnel : channel
    nickname: { type: String, required: true }, // Requis : pseudo
    recipient: { type: String }, // Optionnel : destinataire
    createdAt: { type: Date, default: Date.now } // Par défaut : date actuelle
});
// Vérification et définition du modèle
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
