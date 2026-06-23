#!/bin/bash
set -e

# Helper script to download production ML model weights (ONNX/PyTorch)
# Set the MODEL_WEIGHTS_URL environment variable to trigger the download.

WEIGHTS_URL="${MODEL_WEIGHTS_URL}"
TARGET_DIR="$(dirname "$0")/../ai-service/app/ml_models"

if [ -z "$WEIGHTS_URL" ]; then
  echo "INFO: MODEL_WEIGHTS_URL is not set. Skipping model weights download (will use interim stubs)."
  exit 0
fi

echo "Downloading ML model weights from $WEIGHTS_URL..."
mkdir -p "$TARGET_DIR"

# Download to a temporary file
TEMP_FILE=$(mktemp)
curl -L -o "$TEMP_FILE" "$WEIGHTS_URL"

# Extract based on file type
if [[ "$WEIGHTS_URL" == *.tar.gz ]]; then
  echo "Extracting tar.gz archive..."
  tar -xzf "$TEMP_FILE" -C "$TARGET_DIR"
elif [[ "$WEIGHTS_URL" == *.zip ]]; then
  echo "Extracting zip archive..."
  unzip -o "$TEMP_FILE" -d "$TARGET_DIR"
else
  # Direct model weight file (e.g. .onnx / .bin / .pt)
  FILENAME=$(basename "$WEIGHTS_URL")
  echo "Moving file to $TARGET_DIR/$FILENAME..."
  mv "$TEMP_FILE" "$TARGET_DIR/$FILENAME"
fi

rm -f "$TEMP_FILE"
echo "✓ ML model weights successfully placed in $TARGET_DIR"
