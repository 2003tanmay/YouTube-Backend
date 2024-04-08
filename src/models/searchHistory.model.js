import mongoose, {Schema} from "mongoose";

const searchHistorySchema = new Schema({
    query: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema)