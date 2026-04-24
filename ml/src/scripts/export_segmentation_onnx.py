import argparse

from src.common.config import load_config
from src.segmentation.export_onnx import export_segmentation_to_onnx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/segmentation.yaml")
    args = parser.parse_args()
    config = load_config(args.config)
    out_path = export_segmentation_to_onnx(config)
    print({"segmentation_onnx": out_path})


if __name__ == "__main__":
    main()
