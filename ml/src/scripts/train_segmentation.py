import argparse

from src.common.config import load_config
from src.segmentation.trainer import train_segmentation


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/segmentation.yaml")
    args = parser.parse_args()
    config = load_config(args.config)
    result = train_segmentation(config)
    print(result)


if __name__ == "__main__":
    main()
