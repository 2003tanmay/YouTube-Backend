import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    videos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    isPublc: {
        type: Boolean,
        default: true,
    }
}, {timestamps: true})

export const Playlist = mongoose.model("Playlist", playlistSchema)