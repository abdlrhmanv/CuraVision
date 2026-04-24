import argparse

from src.classification.evaluator import evaluate_classification_model
from src.common.config import load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/classification.yaml")
    parser.add_argument("--split", default="test", choices=["train", "val", "test"])
    args = parser.parse_args()
    config = load_config(args.config)
    result = evaluate_classification_model(config, split=args.split, save_outputs=True)
    print(result)


if __name__ == "__main__":
    main()
