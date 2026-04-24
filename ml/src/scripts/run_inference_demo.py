import argparse
from pprint import pprint

from PIL import Image

from src.common.config import load_config
from src.inference.pipeline import BrainMRIPipeline


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="configs/inference.yaml")
    parser.add_argument("--image", required=True)
    args = parser.parse_args()

    config = load_config(args.config)
    pipeline = BrainMRIPipeline(config)
    image = Image.open(args.image).convert("RGB")
    result = pipeline.analyze(image)

    # CV-only structured output. Send this to backend or ai-service if needed.
    pprint(result.model_dump())


if __name__ == "__main__":
    main()
