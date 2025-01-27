import mongoose, {Schema, Document, models} from 'mongoose';

// Interface TypeScript for a user
export interface IUser extends Document {
    nickname: string;
    socketId: string;
    channels: string[]; // Change 'channel' to 'channels' and make it an array
}

// Schema for users
const userSchema = new Schema<IUser>({
    nickname: { type: String, required: true , unique : true },
    socketId: { type: String, required: true , unique: true },
    channels: { type: [String], default : [] }, // Initialize channels as an array
});

const User = mongoose.models.Users || mongoose.model<IUser>('User', userSchema);

export default User;