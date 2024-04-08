import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // get content from body
    // check content recieved or not
    // create tweet
    // check created or not
    // return res

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is Required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req?.user?._id,
    });

    if (!tweet) {
        throw new ApiError(500, "Error in creating tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, tweet, "Tweet created Successfully"));
})

const getAllTweets = asyncHandler(async (req, res) => {
    // fetch all tweet document
    // fetch owner detail with - username , avatar
    // fetch tweet likes and count them
    // fetch tweet is liked by login user or not
    // return res

    const tweets = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "tweet",
                localField: "_id",
                as: "likes",
            },
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: {
                        $date: "$createdAt",
                    },
                },
                likesCount: {
                    $size: "$likes",
                },
            },
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: {
                    day: 1,
                    month: 1,
                    year: 1,
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                likesCount: 1,
            },
        },
    ]);

    if (!tweets) {
        throw new ApiError(500, "Failed to fetch Twwets");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(201, tweets, "Tweets fetched Successfully")
        );
})

const getUserTweets = asyncHandler(async (req, res) => {
    // get user id from params
    // validate user id
    // match user id in tweet document
    // fetch all tweet
    // fetch owner detail with - username , avatar
    // fetch tweet likes and count them
    // fetch tweet is liked by login user or not
    // return res

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User Id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "owner",
                localField: "_id",
                as: "Owner",

                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "tweet",
                localField: "_id",
                as: "likedetails",

                pipeline: [
                    {
                        $project: {
                            likeBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likedetails",
                },
                ownerDetails: {
                    $first: "$Owner",
                },
            },
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
            },
        },
    ]);

    if (!tweets) {
        throw new ApiError(500, "Error in fetching tweets");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, tweets, "All Tweets fetched Successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    // get tweet id from params
    // validate tweet id
    // get content from body
    // check content recieved or not
    // find tweet from document
    // check owner of tweet is same as login user or not
    // update tweet content
    // return res

    const { content } = req.body;

    const { tweetId } = req.params;

    if (!content) {
        throw new ApiError(400, "Content is Required");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(400, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can not update the tweet as you are not the owner"
        );
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        {
            tweetId,

            $set: { content },
        },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to Update Tweet. Please Try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, updatedTweet, "Tweet updated Successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    // get tweet id from params
    // validate tweet id
    // find tweet from document
    // check owner of tweet is same as login user or not
    // delete tweet content
    // return res

    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(400, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can not delete the tweet as you are not the owner"
        );
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(
        200,
        new ApiResponse(201, {}, "Tweet Deleted Successfully")
    );
})

export {
    getAllTweets,
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}