from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import yaml

from src.common.paths import ML_ROOT


def _resolve_paths(obj: Any) -> Any:
    """Recursively convert relative path strings into absolute paths.

    Only values whose key name looks like a path are resolved. This keeps other
    strings such as class names untouched.
    """
    if isinstance(obj, dict):
        resolved = {}
        for key, value in obj.items():
            if isinstance(value, str) and key.endswith(("_path", "_dir", "root_dir")):
                path = Path(value)
                resolved[key] = str((ML_ROOT / path).resolve()) if not path.is_absolute() else str(path)
            else:
                resolved[key] = _resolve_paths(value)
        return resolved
    if isinstance(obj, list):
        return [_resolve_paths(item) for item in obj]
    return obj


def load_config(config_path: str | Path) -> Dict[str, Any]:
    """Load a YAML config and make its relative paths project-aware."""
    config_path = Path(config_path)
    if not config_path.is_absolute():
        config_path = (ML_ROOT / config_path).resolve()
    with config_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    config["_config_path"] = str(config_path)
    return _resolve_paths(config)
