import argparse

from src.classification.export_onnx import export_classification_to_onnx
from src.common.config import load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/classification.yaml")
    args = parser.parse_args()
    config = load_config(args.config)
    out_path = export_classification_to_onnx(config)
    print({"classification_onnx": out_path})


if __name__ == "__main__":
    main()
