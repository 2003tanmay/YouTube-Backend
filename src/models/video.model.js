import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: {
                url: String,
                public_id: String,
            },
            required: true,
        },
        thumbnail: {
            type: {
                url: String,
                public_id: String,
            },
            required: true,
        },
        title: {
            type: String, 
            required: true,
        },
        description: {
            type: String, 
            required: true,
        },
        duration: {
            type: Number, //cloudinary url video length
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // owner: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "User",
        //     fullname: String,  // Nested field in the owner reference (assuming the User model contains this)
        //     username: String, // Nested field in the owner reference (assuming the User model contains this)
        // },
    }, 
    {timestamps: true}
)

// videoSchema.index({
//     title: "text",
//     description: "text",
//     "owner.fullname": "text",
//     "owner.username": "text",
// }, {
//     name: "search-videos", // Name the full-text search index
//     weights: {
//         title: 5, // Adjust weights based on your preference
//         description: 3,
//         "owner.fullname": 2,
//         "owner.username": 1,
//     }
// });

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)