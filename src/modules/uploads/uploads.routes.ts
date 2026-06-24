import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { imageUpload, audioUpload } from "./uploads.multer";
import {
  handleBookCover,
  handleAuthorAvatar,
  handleProductImage,
  handleProductGallery,
  handleAudioUpload,
} from "./uploads.controller";

export const uploadsRouter = Router();

// All upload endpoints are admin-only
uploadsRouter.use(authenticate(), authorize("ADMIN"));

// POST /api/v1/uploads/book-cover
uploadsRouter.post("/book-cover", imageUpload.single("file"), handleBookCover);

// POST /api/v1/uploads/author-avatar
uploadsRouter.post("/author-avatar", imageUpload.single("file"), handleAuthorAvatar);

// POST /api/v1/uploads/product-image
uploadsRouter.post("/product-image", imageUpload.single("file"), handleProductImage);

// POST /api/v1/uploads/product-gallery
uploadsRouter.post("/product-gallery", imageUpload.single("file"), handleProductGallery);

// POST /api/v1/uploads/audio
uploadsRouter.post("/audio", audioUpload.single("file"), handleAudioUpload);
