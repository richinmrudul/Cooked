import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import CloudinaryStorage
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary v2 SDK
import { Request } from 'express';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => { // Explicitly type req and file
    return {
      folder: 'cooked_app_uploads', // Folder in your Cloudinary account
      format: file.mimetype.split('/')[1], // e.g., 'png', 'jpeg'
      public_id: file.fieldname + '-' + Date.now(), // Unique ID for the file
    };
  },
} as any); // Type assertion 'as any' might be needed depending on multer-storage-cloudinary typings

// File filter to allow only images (same as before)
const fileFilter = (req: Request, file: Express.Multer.File, cb: (error: any, acceptFile: boolean) => void) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB file size limit
  },
});

export default upload;