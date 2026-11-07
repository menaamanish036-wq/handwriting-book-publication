const multer = require("multer");

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, PNG, WEBP and PDF files are allowed.")
    );
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = upload;
