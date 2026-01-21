import express from "express";
import {
  addReview,
  listProductReviews,
  listRecentReviews,
} from "../controllers/reviewController.js";
import authUser from "../middleware/auth.js";

const reviewRouter = express.Router();

reviewRouter.post("/add", authUser, addReview);
reviewRouter.post("/product", listProductReviews);
reviewRouter.get("/recent", listRecentReviews);
reviewRouter.get("/product/:productId", authUser, listProductReviews);



export default reviewRouter;
