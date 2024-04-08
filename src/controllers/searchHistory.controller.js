import mongoose, { isValidObjectId } from "mongoose"
import { SearchHistory } from "../models/searchHistory.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createSearchQuery = asyncHandler(async (req, res) => {
    // get query from body
    // check query recieved or not
    // create query
    // check created or not
    // return res

    const { query } = req.body;

    if (!query) {
        throw new ApiError(400, "Query is Required");
    }

    const searchQuery = await SearchHistory.create({
        query,
        owner: req?.user?._id,
    });

    if (!searchQuery) {
        throw new ApiError(500, "Error in creating query");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, searchQuery, "SearchQuery created Successfully"));
})

const getUserSearchHistory = asyncHandler(async (req, res) => {
    // get user id from req.user
    // match user id in searchHistory document
    // fetch all search queries
    // return res

    const searchQueries = await SearchHistory.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            },
        }
    ]);

    if (!searchQueries) {
        throw new ApiError(500, "Error in fetching queries");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, tweets, "All Queries fetched Successfully"));
})

const deleteSearchQuery = asyncHandler(async (req, res) => {
    // get search query id from params
    // validate search query id
    // find search query from document
    // check owner of search query is same as login user or not
    // delete search query content
    // return res

    const { searchQueryId } = req.params;

    if (!isValidObjectId(searchQueryId)) {
        throw new ApiError(400, "Invalid Search Query Id");
    }

    const searchQuery = await SearchHistory.findById(searchQueryId);

    if (!searchQuery) {
        throw new ApiError(400, "Search Query not found");
    }

    if (searchQuery?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can not delete the Search Query as you are not the owner"
        );
    }

    await SearchHistory.findByIdAndDelete(searchQueryId);

    return res.status(
        200,
        new ApiResponse(201, {}, "Search Query Deleted Successfully")
    );
})

export {
    getUserSearchHistory,
    deleteSearchQuery,
    createSearchQuery
}