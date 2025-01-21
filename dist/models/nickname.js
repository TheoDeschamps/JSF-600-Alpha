import mongoose, { Schema } from 'mongoose';
// Schéma pour les nicknames
const nicknameSchema = new Schema({
    socketId: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
});
// Modèle Mongoose
const Nickname = mongoose.models.Nickname || mongoose.model('Nickname', nicknameSchema);
export default Nickname;
