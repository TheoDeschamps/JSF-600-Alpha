import mongoose, { Schema } from 'mongoose';
// Schéma pour les channels
const channelSchema = new Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});
// Modèle Mongoose
const Channel = mongoose.models.Channel || mongoose.model('Channel', channelSchema);
export default Channel;
