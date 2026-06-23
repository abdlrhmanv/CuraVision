const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

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
  
  // Always save locally so the local worker can access it
  const dir = ensureDir(path.join(getStorageRoot(), "dicoms", scanId));
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, buffer);

  if (s3Client) {
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `dicoms/${scanId}/${filename}`,
      Body: buffer,
      ContentType: "application/dicom",
    }));
  }

  return { absPath, logicalPath };
}

/**
 * Uploads a local file to S3/MinIO if enabled.
 *
 * @param {string} logicalPath
 */
async function uploadLocalFile(logicalPath) {
  if (!s3Client) return;
  const key = logicalPath.replace(/^storage\//, "");
  const localPath = path.join(getStorageRoot(), key);
  if (!fs.existsSync(localPath)) {
    console.warn(`[storageClient] Local file not found for S3 upload: ${localPath}`);
    return;
  }
  const buffer = fs.readFileSync(localPath);
  let contentType = "application/octet-stream";
  if (logicalPath.endsWith(".png")) {
    contentType = "image/png";
  } else if (logicalPath.endsWith(".nii.gz")) {
    contentType = "application/gzip";
  } else if (logicalPath.endsWith(".dcm")) {
    contentType = "application/dicom";
  }

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

/**
 * Fetches an object from S3 as a stream.
 *
 * @param {string} logicalPath
 * @returns {Promise<any>}
 */
async function getObjectStream(logicalPath) {
  if (!s3Client) return null;
  const key = logicalPath.replace(/^storage\//, "");
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
    return response.Body;
  } catch (err) {
    if (err.name === "NoSuchKey") {
      return null;
    }
    throw err;
  }
}

/**
 * Checks if S3/MinIO storage is enabled.
 *
 * @returns {boolean}
 */
function isS3Enabled() {
  return !!s3Client;
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
  uploadLocalFile,
  getObjectStream,
  isS3Enabled,
  derivedPaths,
};
