#!/bin/bash
set -e

# Download production ONNX weights into MODEL_WEIGHTS_DIR (default: ai-service/app/ml_models).
# Archive must contain classification.onnx and segmentation.onnx (at root or in subfolders).

WEIGHTS_URL="${MODEL_WEIGHTS_URL}"
TARGET_DIR="${MODEL_WEIGHTS_DIR:-$(cd "$(dirname "$0")/.." && pwd)/ai-service/app/ml_models}"

if [ -z "$WEIGHTS_URL" ]; then
  echo "INFO: MODEL_WEIGHTS_URL is not set. Skipping model weights download."
  exit 0
fi

echo "Downloading ML model weights from $WEIGHTS_URL..."
mkdir -p "$TARGET_DIR"

TEMP_FILE=$(mktemp)
curl -fsSL -o "$TEMP_FILE" "$WEIGHTS_URL"

if [[ "$WEIGHTS_URL" == *.tar.gz ]]; then
  echo "Extracting tar.gz archive..."
  tar -xzf "$TEMP_FILE" -C "$TARGET_DIR"
elif [[ "$WEIGHTS_URL" == *.zip ]]; then
  echo "Extracting zip archive..."
  unzip -o "$TEMP_FILE" -d "$TARGET_DIR"
else
  FILENAME=$(basename "$WEIGHTS_URL")
  echo "Moving file to $TARGET_DIR/$FILENAME..."
  mv "$TEMP_FILE" "$TARGET_DIR/$FILENAME"
  TEMP_FILE=""
fi

[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

for model_file in classification.onnx segmentation.onnx; do
  if [ ! -f "$TARGET_DIR/$model_file" ]; then
    found=$(find "$TARGET_DIR" -name "$model_file" -type f | head -1)
    if [ -n "$found" ]; then
      cp "$found" "$TARGET_DIR/$model_file"
    else
      echo "ERROR: $model_file not found under $TARGET_DIR"
      exit 1
    fi
  fi
  data_file="${model_file}.data"
  if [ ! -f "$TARGET_DIR/$data_file" ]; then
    found_data=$(find "$TARGET_DIR" -name "$data_file" -type f | head -1)
    if [ -n "$found_data" ]; then
      cp "$found_data" "$TARGET_DIR/$data_file"
    else
      echo "ERROR: $data_file not found under $TARGET_DIR (required for ONNX external weights)"
      exit 1
    fi
  fi
done

echo "✓ ONNX models ready in $TARGET_DIR"
ls -lh "$TARGET_DIR"/classification.onnx "$TARGET_DIR"/classification.onnx.data \
        "$TARGET_DIR"/segmentation.onnx "$TARGET_DIR"/segmentation.onnx.data
