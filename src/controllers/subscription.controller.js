import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // get channelId from params
    // validate channel id
    // check login user already subscribed or not
    // if sunscribed delete subscribed document and return res
    // else crete subscribed document and return res

    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid ChannelId");
    }

    const subscriberAlready = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id,
    });

    if (subscriberAlready) {
        await Subscription.findByIdAndDelete(subscriberAlready?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    201,
                    { subscribed: false },
                    "Channel Unsubscribed Successfully"
                )
            );
    }

    await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                { subscribed: true },
                "Channel Subscribed Successfully"
            )
        );
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // get channel id from params
    // validate channel id
    // match channel id in subscription document
    // get users who is subscriber in document to the channel id
    // get subscriber detail with User model like - name, username, avatar
    // return res

    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid ChannelId");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "subscriber",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            foreignField: "channel",
                            localField: "_id",
                            as: "subscriberdToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscriberdToSubscriber: {
                                $cond: {
                                    $if: {
                                        $in: [
                                            channelId,
                                            "$subscriberdToSubscriber?.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscriberCount: {
                                $sum: "$subscriberdToSubscriber",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $project: {
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar?.url": 1,
                    subscriberdToSubscriber: 1,
                    subscriberCount: 1,
                },
            },
        },
    ]);

    if (!subscribers) {
        throw new ApiError(500, "Failed to fetch Subscribers");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(201, subscribers, "Subscribers fetched Successfully")
        );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // get channel id from params
    // validate subscriber id
    // match subscriber in subscription document with user id
    // get channel detail whom user is subscribing like - name, username, avatar, subscriber count 
    // return res

    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid Subscriber Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "channel",
                as: "subscribedChannels",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            foreignField: "owner",
                            localField: "_id",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$vidoes",
                            },
                        },
                    },
                    {
                        $lookup: {
                           from: "subscriptions",
                           localField: "_id",
                           foreignField: "channel",
                           as: "subscribers",
                        },
                     },
                     {
                        $addFields: {
                           subscribersCount: {
                              $size: "$subscribers",
                           },
                        },
                     },
                ],
            },
        },
        {
            $unwind: "$subscribedChannels",
        },
        {
            $project: {
                subscribedChannels: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    subscribersCount: 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        duration: 1,
                        title: 1,
                        createdAt: 1,
                        description: 1,
                        owner: 1,
                    },
                },
            },
        },
    ]);

    if (!subscribedChannels) {
        throw new ApiError(500, "Failed to fetch subscribed channels");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                subscribedChannels,
                "subscribed channels fetched Successfully"
            )
        );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}