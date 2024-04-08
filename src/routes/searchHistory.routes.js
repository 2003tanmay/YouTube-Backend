import { Router } from 'express';
import {
    getUserSearchHistory,
    deleteSearchQuery,
    createSearchQuery
} from "../controllers/searchHistory.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createSearchQuery);
router.route("/search-history").get(getUserSearchHistory);
router.route("/:searchQueryId").delete(deleteSearchQuery);

export default router