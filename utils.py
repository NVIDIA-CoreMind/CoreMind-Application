"""
CoreMind Application - Utility Scripts
Utility functions for development and maintenance tasks.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, List


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent


def run_command(command: List[str], cwd: Path = None) -> subprocess.CompletedProcess:
    """Run a shell command and return the result."""
    if cwd is None:
        cwd = get_project_root()
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True)


def run_npm_command(command: str, cwd: Path = None) -> subprocess.CompletedProcess:
    """Run an npm command."""
    return run_command(["npm", "run", command], cwd)


def run_tests() -> bool:
    """Run the test suite."""
    print("Running tests...")
    result = run_npm_command("test")
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def run_build() -> bool:
    """Run the build process."""
    print("Building project...")
    result = run_npm_command("build")
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def run_lint() -> bool:
    """Run the linter."""
    print("Running linter...")
    result = run_npm_command("lint")
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def get_package_json() -> Dict[str, Any]:
    """Read and parse package.json."""
    package_json_path = get_project_root() / "package.json"
    with open(package_json_path, "r") as f:
        return json.load(f)


def get_project_info() -> Dict[str, Any]:
    """Get basic project information."""
    pkg = get_package_json()
    return {
        "name": pkg.get("name", "unknown"),
        "version": pkg.get("version", "0.0.0"),
        "description": pkg.get("description", ""),
        "scripts": list(pkg.get("scripts", {}).keys()),
    }


def list_typescript_files() -> List[Path]:
    """List all TypeScript/TSX files in the project."""
    root = get_project_root()
    ts_files = list(root.rglob("*.ts"))
    tsx_files = list(root.rglob("*.tsx"))
    return ts_files + tsx_files


def count_lines_of_code() -> Dict[str, int]:
    """Count lines of code in the project."""
    ts_files = list_typescript_files()
    total_lines = 0
    file_count = 0
    
    for file_path in ts_files:
        try:
            with open(file_path, "r") as f:
                lines = len(f.readlines())
                total_lines += lines
                file_count += 1
        except Exception:
            pass
    
    return {
        "files": file_count,
        "total_lines": total_lines,
        "avg_lines_per_file": total_lines // file_count if file_count > 0 else 0
    }


def main():
    """Main entry point for the utility script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="CoreMind Application Utilities")
    parser.add_argument("command", choices=["test", "build", "lint", "info", "loc"], 
                       help="Command to run")
    
    args = parser.parse_args()
    
    if args.command == "test":
        success = run_tests()
        sys.exit(0 if success else 1)
    elif args.command == "build":
        success = run_build()
        sys.exit(0 if success else 1)
    elif args.command == "lint":
        success = run_lint()
        sys.exit(0 if success else 1)
    elif args.command == "info":
        info = get_project_info()
        print(json.dumps(info, indent=2))
    elif args.command == "loc":
        stats = count_lines_of_code()
        print(f"Files: {stats['files']}")
        print(f"Total lines: {stats['total_lines']}")
        print(f"Avg lines/file: {stats['avg_lines_per_file']}")


if __name__ == "__main__":
    main()