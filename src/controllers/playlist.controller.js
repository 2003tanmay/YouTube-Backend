import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    // tak name and description of a playlist
    // check all recieved or not
    // create playlist
    // check created or not
    // return res

    const { name, description } = req.body;

    if (!name && !description) {
        throw new ApiError(400, "all fields are required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    if (!playlist) {
        throw new ApiError(500, "Failed to create a playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, playlist, "Playlist created Successfully"));

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    // take userId from params
    // check for valid id
    // get all playlist
    // match userId in owner of playlist
    // count total videos by counting matched document
    // check playlist found or not
    // return res

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $addFields: {
                totalViwes: {
                    $sum: "$videos.views",
                },
                totalVideos: {
                    $size: "$videos",
                },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViwes: 1,
                updatedAt: 1,
            },
        },
    ]);

    if (!playlists) {
        throw new ApiError(500, "Failed to fetch the user playlists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(201, playlists, "User playlist fetched Successfully")
        );
})

const getPlaylistById = asyncHandler(async (req, res) => {
    // get playlist id from params
    // check for valid id
    // match playlist id 
    // get all videos matching with playlist id
    // get all published video only
    // get owner detail of playlist
    // calculate total video in playlist count
    // form videos find video details with owner details of owner of videos
    // check playlist fetchd or not
    // return res

    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "videos",
                as: "videos",
            },
        },
        {
            $match: {
                "videos.isPublished": true,
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
            $addFields: {
                totalViews: {
                    $sum: "$videos.views",
                },
                owner: {
                    $first: "$owner",
                },
                totalVideos: {
                    $size: "$videos",
                },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                videos: {
                    _id: 1,
                    createdAt: 1,
                    description: 1,
                    views: 1,
                    title: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    duration: 1,
                },
            },
        },
    ]);

    if (!playlist) {
        throw new ApiError(500, "Failed to fetch playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, playlist, "Playlist fetched Successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // get playlist id and video id from params
    // validate both id
    // find video via video id
    // find playlist via playlist id
    // check owner of playlist is same as login user or not
    // add video to playlist and update playlist
    // return res

    const { playlistId, videoId } = req.params;

    if (!(isValidObjectId(playlistId) || isValidObjectId(videoId))) {
        throw new ApiError(400, "Check PlaylistId and VideoId Once again");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "PlaylistId not found");
    }

    if (
        (playlist?.owner?.toString() && video?.owner?.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(400, "Only Owner can add videos to playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(400, "Failed to update the playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                updatedPlaylist,
                "Video has been added to playlist Successfully"
            )
        );

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // get playlist id and video id from params
    // validate both id
    // find video via video id
    // find playlist via playlist id
    // check owner of playlist is same as login user or not
    // remove video to playlist and update playlist
    // return res

    const { playlistId, videoId } = req.params;

    if (!(isValidObjectId(playlistId) || isValidObjectId(videoId))) {
        throw new ApiError(400, "Check PlaylistId and VideoId Once again");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "PlaylistId not found");
    }

    if (
        (playlist?.owner?.toString() && video?.owner?.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(400, "Only Owner can delete videos to playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(400, "Failed to update the playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                updatedPlaylist,
                "Video has been deleted from playlist Successfully"
            )
        );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // get playlist id from params
    // validate id
    // find playlist via playlist id
    // check owner of playlist is same as login user or not
    // remove playlist
    // return res

    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "PlaylistId not found");
    }

    if (playlist?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only Owner can delete playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(201, {}, "Playlist deleted Successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    // get playlist id from params
    // validate id
    // get name and description from body
    // check both are present or not
    // find playlist by id
    // check owner of playlist is same as login user or not
    // update playlist
    // return res

    const { playlistId } = req.params;

    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Check PlaylistId Once again");
    }

    if (!(name || description)) {
        throw new ApiError(400, "Name and Description both are required");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "PlaylistId not found");
    }

    if (playlist?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only Owner can update playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update the Playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                201,
                updatedPlaylist,
                "Playlist has been Updated Successfully"
            )
        );
})

const togglePublicStatus = asyncHandler(async (req, res) => {
    // get playlist id from params
    // validate id
    // find playlist by id
    // check owner of playlist is same as login user or not
    // update playlist
    // return res

    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(500, "Failed to find the Playlist");
    }

    if (playlist?.owner.toString() !== req.user?.public_id.toString()) {
        throw new ApiError(
            400,
            "You can not toggle public the playlist as you are not the owner of the playlist"
        );
    }

    playlist.isPublic = !playlist.isPublic;

    const isPublicStatus = await playlist.save({ validateBeforeSave: false });
    if (!isPublicStatus) {
        throw new ApiError(409, "Somthing went wrong")
    }

    return res.status(200)
        .json(new ApiResponse(
            200,
            {},
            "Playlist public status toggle successfully"
        ))
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    togglePublicStatus
}