import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    // get all video accroding to parameter given
    // fetch every video details with the owner avatar and channel name
    // if user id is given then show only userId's video
    // and show all published and non-published video
    // get all video according to query. Query can contain -
    // search video by title or description only
    // if user id is not given get all published video only and
    // get all video according to query. Query can contain -
    // search video by title, description or channel name
    // sort the video, user id is given or not by -
    // sort type asc or desc
    // sort by - UPLOAD DATE: Last hour, Today, This week, This month, This year and 
    // by DURATION: Under 4 minutes, 4 - 20 minutes, Over 20 minutes and 
    // by: most popular (by views in desc order), latest (by uploading date), older(by uploading date).

    const { page = 1, limit = 10, query, userId, sortType, sortBy } = req.query;

    const pipeline = [];

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
        },
    });

    // Unwind ownerDetails array
    pipeline.push({
        $unwind: "$ownerDetails",
    });

    if (userId) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid UserId");
        }

        // Match videos by owner (channel) ID
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        });

        if (query) {
            // Search by keywords in title, description, and channel name
            pipeline.push({
                $search: {
                    index: "search-videos",
                    text: {
                        query: query,
                        path: ["title", "description"],
                    },
                },
            });
        }
    }

    if (!userId) {
        // Fetch only published videos if userId is not provided
        pipeline.push({ $match: { isPublished: true } });

        if (query) {
            // Search by keywords in title, description, and channel name
            pipeline.push({
                $search: {
                    index: "search-videos",
                    text: {
                        query: query,
                        path: ["title", "description", "ownerDetails.fullname", "ownerDetails.username"],
                    },
                },
            });
        }
    }

    // Sorting criteria
    const sortCriteria = {};
    switch (sortBy) {
        case "uploadDate":
            sortCriteria.createdAt = sortType === "desc" ? -1 : 1;
            break;
        case "duration":
            sortCriteria.duration = 1; // Sorting by duration (ascending)
            break;
        case "popularity":
            sortCriteria.views = -1; // Sorting by views (descending)
            break;
        default:
            sortCriteria.createdAt = -1; // Default sorting by upload date (latest first)
            break;
    }
    pipeline.push({ $sort: sortCriteria });

    // Pagination options
    const options = {
        page: parseInt(page, 1),
        limit: parseInt(limit, 10),
    };

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    );

    res.status(200).
    json(
        new ApiResponse(
            200, 
            videos, 
            "Videos Fetched Successfully"
        ));
})

const publishAVideo = asyncHandler(async (req, res) => {
    // get video and thumbnail from file
    // get title and description from body
    // validation - not empty all field
    // upload files to cloudinary -- video and thumbnail
    // get video duration from cloudinary url
    // get user id (owner id)
    // create video object - create entry in db
    // check for video creation
    // if video not creted delete video and thumbnail file form cloudinary
    // return res

    const { title, description} = req.body

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Title and Description fields are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    
    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video and Thumbnail file is required")
    }

    const videoId = await uploadOnCloudinary(videoLocalPath);
    const thumbnailId = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoId || !thumbnailId) {
        throw new ApiError(400, "Video and Thumbnail file is required")
    }

    const videoDB = await Video.create({
        videoFile: {
            url: videoId.url,
            public_id: videoId.public_id
        },
        thumbnail: {
            url: thumbnailId.url,
            public_id: thumbnailId.public_id
        },
        title,
        description,
        duration: videoId?.duration,
        owner: req.user?._id
    })

    // if video not uploded delete video from cludinary
    if (!videoDB && videoId) {
        await deleteFromCloudinary(videoId.public_id, "video");
    }

    // if video not uploded delete thumbnail image from cludinary
    if (!videoDB && thumbnailId) {
        await deleteFromCloudinary(thumbnailId.public_id);
    }

    if (!videoDB) {
        throw new ApiError(500, "Something went wrong while uploading the video")
    }

    return res.status(201).json(
        new ApiResponse(200, videoDB, "Video Uploaded Successfully")
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    // take videoId from params
    // check fro video id
    // make aggregation pipeline 
    // calculate like count from Like model
    // fetch owner details from User model
    // calculate subscriber count of owner from Subscription model
    // find the viewer of video is subscribed to owner or not
    // project all video detail owner detail with subscriber count and isSubscribed field and like count
    // increase view count of the video
    // add video to the watch history of login user
    // return res

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiErrors(400, "Invalid Video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: 'likes', // Name of the Like collection
                localField: '_id', // Field in the Video collection
                foreignField: 'video', // Field in the Like collection
                as: 'likes' // Output field name
            }
        },
        {
            $lookup: {
                from: 'users', // Name of the User collection
                localField: 'owner', // Field in the Video collection
                foreignField: '_id', // Field in the User collection
                as: 'ownerInfo' // Output field name
            },
            pipeline: [
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
                      isSubscribed: {
                         $cond: {
                            $if: {
                               $in: [req.user?._id, "$subscribers.subsciber"],
                            },
                            then: true,
                            else: false,
                         },
                      },
                   },
                },
                {
                   $project: {
                      username: 1,
                      "avatar.url": 1,
                      subscribersCount: 1,
                      isSubscribed: 1,
                   },
                },
            ],
        },
        {
            $addFields: {
                likeCount: { 
                    $size: '$likes' 
                },
                owner: {
                    $first: "$Owner",
                },
                isLiked: {
                    $cond: {
                       $if: {
                          $in: [req.user?._id, "$likes.likedBy"],
                       },
                       then: true,
                       else: false,
                    },
                },
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                owner: 1,
                likeCount: 1,
                isLiked: 1,
            }
        }
    ])

    if(!video?.length) {
        throw new ApiError(404, "video does not exists");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
           views: 1,
        },
     });

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
           watchHistory: videoId,
        },
     });

    return res.status(200)
    .json(new ApiResponse(
        200,
        video[0],
        "Video fetched successfully"
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    // get video id from params 
    // get thumbnail, title and description 
    // check all should recieve
    // find object by video id
    // check the owner of video is same as login user or not
    // if not same can not update video
    // delete old image
    // return res

    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId");
     }

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video does not exist");
    }

    if (video?.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(400, "Only Owner can Update the video");
    }

    const newThumbnailLocalPath = req.files?.path;
    const oldThumbnail = video.thumbnail.public_id;    

    if (!newThumbnailLocalPath || !oldThumbnail) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    const thumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
    if (!thumbnail) {
      throw new ApiError(400, "Thumbnail not found");
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    url: thumbnail?.url,
                    public_id: thumbnail?.public_id
                }
            }
        },
        { new: true }
        )
        
        if (!updatedVideo) {
            await deleteFromCloudinary(newThumbnailLocalPath);
            throw new ApiError(500, "Failed to update the video");
        }
        
    // deleting old thumbnail image from cloudinary    
    await deleteFromCloudinary(oldThumbnail);
    
    return res.status(200)
        .json(new ApiResponse(
            200,
            video,
            "Video details updated successfully"
        ))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }
    
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video Id is missing")
    }

    if (video?.owner.toString() !== req.user?.public_id.toString()) {
        throw new ApiError(
           400,
           "You can not delete the video as you are not the owner of the video"
        );
     }

    const deletedVideo = await video.remove();

    await deleteFromCloudinary(video.thumbnail.public_id);
    await deleteFromCloudinary(video.videoFile.public_id, "video");

    if (!deletedVideo) {
        throw new ApiError(500, "Somthing went wrong while deleting video")
    }

    return res.status(200)
        .json(new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);
    
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video?.owner.toString() !== req.user?.public_id.toString()) {
        throw new ApiError(
           400,
           "You can not toggle publish the video as you are not the owner of the video"
        );
    }

    video.isPublished = !video.isPublished;

    const isPublishedStatus = await video.save({ validateBeforeSave: false });
    if(!isPublishedStatus) {
        throw new ApiError(409, "Somthing went wrong")
    }

    return res.status(200)
        .json(new ApiResponse(
            200,
            {},
            "Video publish status toggle successfully"
        ))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}