const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = process.env.S3_ENDPOINT ? new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "curavision",
    secretAccessKey: process.env.S3_SECRET_KEY || "curavision",
  },
  forcePathStyle: true,
}) : null;

const S3_BUCKET = process.env.S3_BUCKET || "curavision";

/**
 * Resolve the root directory used for local object storage.
 * Configurable via STORAGE_PATH; defaults to <repo>/backend/storage.
 */
function getStorageRoot() {
  const configured = process.env.STORAGE_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured);
  }
  return path.resolve(__dirname, "..", "..", "storage");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Save a DICOM buffer to <storage>/dicoms/<scanId>/<filename>.
 * Returns the absolute path and a logical (URL-ish) path used in DB.
 *
 * @param {string} scanId
 * @param {string} filename
 * @param {Buffer} buffer
 */
async function saveDicom(scanId, filename, buffer) {
  const logicalPath = `storage/dicoms/${scanId}/${filename}`;
  
  if (s3Client) {
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `dicoms/${scanId}/${filename}`,
      Body: buffer,
      ContentType: "application/dicom",
    }));
    return { absPath: null, logicalPath };
  }

  const dir = ensureDir(path.join(getStorageRoot(), "dicoms", scanId));
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, buffer);
  return { absPath, logicalPath };
}

/**
 * Reserve logical paths for derived assets (mask, heatmap) without writing
 * any bytes yet. Used by the mock analysis pipeline.
 */
function derivedPaths(scanId) {
  return {
    mask_path: `storage/masks/${scanId}.nii.gz`,
    gradcam_path: `storage/heatmaps/${scanId}.png`,
  };
}

module.exports = {
  getStorageRoot,
  saveDicom,
  derivedPaths,
};
