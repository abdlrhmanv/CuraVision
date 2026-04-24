import argparse

from src.classification.trainer import train_classification
from src.common.config import load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/classification.yaml")
    args = parser.parse_args()
    config = load_config(args.config)
    result = train_classification(config)
    print(result)


if __name__ == "__main__":
    main()
