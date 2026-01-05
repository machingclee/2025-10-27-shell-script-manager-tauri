#!/usr/bin/env python3
"""
Script to migrate requirements.txt to uv project (pyproject.toml)
Identifies direct dependencies and adds them using uv add
"""

import re
import subprocess
import sys


def parse_requirements(requirements_file):
    """Parse requirements.txt and identify direct dependencies"""
    direct_deps = []
    current_package = None

    with open(requirements_file, 'r') as f:
        lines = f.readlines()

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip comments and empty lines
        if not line or line.startswith('#'):
            i += 1
            continue

        # Package line (not indented, contains ==)
        if '==' in line and not line.startswith(' '):
            package_name = line.split('==')[0].strip()
            current_package = package_name

            # Check next line for "via" comment to determine if direct dependency
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()

                # If next line is a "via" comment
                if next_line.startswith('# via'):
                    # Check if it mentions pyproject.toml (direct dependency)
                    if 'pyproject.toml' in next_line:
                        direct_deps.append(package_name)
                    # Or if it's a multi-line via, check all via lines
                    elif i + 2 < len(lines):
                        j = i + 1
                        is_direct = False
                        while j < len(lines) and lines[j].strip().startswith('#'):
                            if 'pyproject.toml' in lines[j]:
                                is_direct = True
                                break
                            j += 1
                        if is_direct:
                            direct_deps.append(package_name)
            i += 1
        else:
            i += 1

    return direct_deps


def main():
    requirements_file = 'requirements.txt'

    print("🔍 Parsing requirements.txt to identify direct dependencies...")
    direct_deps = parse_requirements(requirements_file)

    if not direct_deps:
        print("❌ No direct dependencies found in requirements.txt")
        print(
            "💡 Looking for packages with '# via <project-name> (pyproject.toml)' comments")
        sys.exit(1)

    print(f"✅ Found {len(direct_deps)} direct dependencies:")
    for dep in direct_deps:
        print(f"   - {dep}")

    print("\n📦 Adding dependencies to pyproject.toml...")

    # Add all dependencies at once
    cmd = ['uv', 'add'] + direct_deps

    try:
        result = subprocess.run(
            cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        print("✅ Successfully migrated to uv project!")
        print("\n💡 Next steps:")
        print("   - Review pyproject.toml")
        print("   - Run 'uv sync' to ensure everything is locked")
        print("   - You can delete requirements.txt or regenerate it with:")
        print("     uv pip compile pyproject.toml -o requirements.txt")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running uv add: {e}")
        print(e.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
