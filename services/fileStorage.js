const mongoose = require("mongoose");
const { GridFSBucket } = require("mongoose").mongo;
const { Readable } = require("stream");
const crypto = require("crypto");

const BUCKET_NAME = "uploads";

function getBucket() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database connection is not ready.");
  }

  return new GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME
  });
}

// SAVE FILE TO MONGODB
async function saveFile(file, uploadedBy = null) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error("Invalid file.");
  }

  const bucket = getBucket();
  const fileId = new mongoose.Types.ObjectId();

  const uploadStream = bucket.openUploadStreamWithId(
    fileId,
    crypto.randomUUID(),
    {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedBy: uploadedBy ? String(uploadedBy) : null,
        uploadedAt: new Date()
      }
    }
  );

  await new Promise((resolve, reject) => {
    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", resolve);
  });

  return {
    fileId: uploadStream.id,
    fileName: file.originalname,
    fileType: file.mimetype,
    size: file.size
  };
}

// GET FILE STREAM
function getFileStream(fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    throw new Error("Invalid file ID.");
  }

  const bucket = getBucket();

  return bucket.openDownloadStream(
    new mongoose.Types.ObjectId(fileId)
  );
}

// DELETE FILE
async function deleteFile(fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    throw new Error("Invalid file ID.");
  }

  const bucket = getBucket();

  await bucket.delete(
    new mongoose.Types.ObjectId(fileId)
  );
}

module.exports = {
  saveFile,
  getFileStream,
  deleteFile
};
