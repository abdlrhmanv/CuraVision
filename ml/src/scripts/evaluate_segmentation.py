import argparse

from src.common.config import load_config
from src.segmentation.evaluator import evaluate_segmentation_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/segmentation.yaml")
    parser.add_argument("--split", default="test", choices=["train", "val", "test"])
    args = parser.parse_args()
    config = load_config(args.config)
    result = evaluate_segmentation_model(config, split=args.split, save_outputs=True)
    print(result)


if __name__ == "__main__":
    main()
