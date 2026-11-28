import json
from pathlib import Path


def test_team_workspace_manifests_valid():
    root = Path(__file__).resolve().parent.parent
    pkg = json.loads((root / "package.json").read_text(encoding="utf-8"))
    assert "name" in pkg
    assert (root / "pnpm-workspace.yaml").exists()
    assert (root / "tsconfig.json").exists()
