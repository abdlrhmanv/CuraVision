import random

import numpy as np
import torch


def set_seed(seed: int = 42) -> None:
    """Set seeds for reproducibility.

    This does not guarantee bitwise-identical runs on every GPU, but it reduces
    randomness enough for debugging and learning.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
