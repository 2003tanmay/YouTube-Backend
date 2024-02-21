import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    // take videoId from params 
    // check id is valid or not/
    // find like document by video id and login user id
    // if find delete the document
    // if not found crete the document by video id and login user id
    // return res according to status

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId");
    }

    const alreadyLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (alreadyLike) {
        await Like.findByIdAndDelete(alreadyLike?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(201, { liked: false }, "Video Unliked Successfully")
            );
    }

    const like = await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (!like) {
        throw new ApiError(400, "Somthing went wrong while liking the video");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, { liked: true }, "Video Liked Successfully"));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    // take commentId from params 
    // check id is valid or not
    // find like document by comment id and login user id
    // if find delete the document
    // if not found crete the document by comment id and login user id
    // return res according to status

    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid CommentId");
    }

    const alreadyLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (alreadyLike) {
        await Like.findByIdAndDelete(alreadyLike?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(201, { liked: false }, "Comment Unliked Successfully")
            );
    }

    const like = await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (!like) {
        throw new ApiError(400, "Somthing went wrong while liking the comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, { liked: true }, "Comment Liked Successfully"));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    // take tweetId from params 
    // check id is valid or not
    // find like document by tweet id and login user id
    // if find delete the document
    // if not found crete the document by tweet id and login user id
    // return res according to status

    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid TweetId");
    }

    const alreadyLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (alreadyLike) {
        await Like.findByIdAndDelete(alreadyLike?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(201, { liked: false }, "Tweet Unliked Successfully")
            );
    }

    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (!like) {
        throw new ApiError(400, "Somthing went wrong while liking the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, { liked: true }, "Tweet Liked Successfully"));

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    // get login user id 
    // find all like document liked by user
    // group all video id's
    // find all video from Video model via video id 
    // fetch all published videos
    // fetch owner details of all videos
    // if query is given serch video by title or description
    // sort video by upload date, duration and popularity
    // add options
    // return res

    const { page = 1, limit = 10, query, sortType, sortBy } = req.query;
    
    const userId = req.user?._id;
    
    const pipeline = [
        { 
            $match: { 
                likedBy: userId 
            } 
        },
        { 
            $group: { 
                _id: '$video' 
            } 
        },
        {
            $lookup: {
                from: 'videos',
                localField: '_id',
                foreignField: '_id',
                as: 'videoDetails'
            }
        },
        { 
            $match: { 
                'videoDetails.isPublished': true 
            } 
        },
        {
            $lookup: {
                from: 'users',
                localField: 'videoDetails.owner',
                foreignField: '_id',
                as: 'ownerDetails'
            }
        },
        { 
            $unwind: '$ownerDetails' 
        }   
    ]

    // If query is provided, perform search
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"]
                }
            }
        });
    }

    // Sorting criteria
    const sortCriteria = {};
    switch (sortBy) {
        case "uploadDate":
            sortCriteria.createdAt = sortType === "desc" ? -1 : 1;
            break;
        case "duration":
            sortCriteria.duration = sortType === "asc" ? 1 : -1;
            break;
        case "popularity":
            sortCriteria.views = sortType === "desc" ? -1 : 1;
            break;
        default:
            sortCriteria.createdAt = -1; // Default sorting by upload date (latest first)
            break;
    }
    pipeline.push({ $sort: sortCriteria });

    // Pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const likedVideo = await Like.aggregatePaginate(
        Like.aggregate(pipeline),
        options
    );

    res.status(200).
    json(
        new ApiResponse(
            200, 
            likedVideo, 
            "Liked Videos Fetched Successfully"
        ));

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}