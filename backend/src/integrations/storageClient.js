const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const logger = require("../utils/logger");

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
 * Save a file buffer to <storage>/scans/<scanId>.<ext>.
 * Returns the absolute path and a logical (URL-ish) path used in DB.
 *
 * @param {string} scanId
 * @param {string} filename
 * @param {Buffer} buffer
 */
async function saveDicom(scanId, filename, buffer) {
  const isJpeg = buffer && buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8;
  const ext = isJpeg ? ".jpg" : ".dcm";
  const contentType = isJpeg ? "image/jpeg" : "application/dicom";
  
  // QA plan expects: scans/<uuid>.dcm or .jpg
  const normalizedName = `${scanId}${ext}`;
  const logicalPath = `storage/scans/${normalizedName}`;
  
  // Always save locally so the local worker can access it
  const dir = ensureDir(path.join(getStorageRoot(), "scans"));
  const absPath = path.join(dir, normalizedName);
  fs.writeFileSync(absPath, buffer);

  if (s3Client) {
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `scans/${normalizedName}`,
      Body: buffer,
      ContentType: contentType,
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
    logger.warn(`[storageClient] Local file not found for S3 upload: ${localPath}`);
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
 * Probe S3/MinIO connectivity for admin health dashboards.
 * @returns {Promise<"up"|"down"|"disabled">}
 */
async function checkStorageHealth() {
  if (!s3Client) return "disabled";
  try {
    await s3Client.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: "__health_probe__",
    }));
    return "up";
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return "up";
    }
    return "down";
  }
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

async function getPresignedGetUrl(logicalPath, expiresInSeconds = 3600, options = {}) {
  if (!s3Client) return null;
  const key = logicalPath.replace(/^storage\//, "");
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  // AI workers run on the Docker network and must reach MinIO directly.
  if (options.internal) {
    return url;
  }
  if (process.env.BACKEND_URL && url.includes(process.env.S3_ENDPOINT)) {
    // Public/browser URL via the reverse proxy.
    return url.replace(process.env.S3_ENDPOINT, `${process.env.BACKEND_URL}/minio`);
  }
  return url;
}

async function getPresignedPutUrl(
  logicalPath,
  contentType = "image/png",
  expiresInSeconds = 3600,
  options = {}
) {
  if (!s3Client) return null;
  const key = logicalPath.replace(/^storage\//, "");
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  if (options.internal) {
    return url;
  }
  if (process.env.BACKEND_URL && url.includes(process.env.S3_ENDPOINT)) {
    return url.replace(process.env.S3_ENDPOINT, `${process.env.BACKEND_URL}/minio`);
  }
  return url;
}

module.exports = {
  getStorageRoot,
  saveDicom,
  uploadLocalFile,
  getObjectStream,
  isS3Enabled,
  checkStorageHealth,
  derivedPaths,
  getPresignedGetUrl,
  getPresignedPutUrl,
};
