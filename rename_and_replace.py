import os
import re

ignore_dirs = {'.git', 'node_modules', 'out', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv'}

def replace_text_in_file(filepath):
    # Skip binary/lock files
    if filepath.endswith(('.pth', '.onnx', '.db', '.lock', '.lockb', '.tsbuildinfo', '.png', '.jpg', '.jpeg', '.asc')):
        return False

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if replacement is needed
        if not re.search(r'(?i)plantify', content):
            return False

        # Replace variations
        new_content = content
        new_content = new_content.replace('Plantify', 'BlueVision')
        new_content = new_content.replace('PLANTIFY', 'BLUEVISION')
        new_content = new_content.replace('plantify', 'bluevision')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def rename_file(filepath):
    dirname, basename = os.path.split(filepath)
    if 'plantify' in basename.lower():
        # Handle variations in filename if needed
        new_basename = basename
        new_basename = new_basename.replace('Plantify', 'BlueVision')
        new_basename = new_basename.replace('PLANTIFY', 'BLUEVISION')
        new_basename = new_basename.replace('plantify', 'bluevision')

        new_filepath = os.path.join(dirname, new_basename)
        os.rename(filepath, new_filepath)
        print(f"Renamed: {filepath} -> {new_filepath}")
        return new_filepath
    return filepath

def main():
    renamed_files = []
    modified_files = []

    for root, dirs, files in os.walk('.', topdown=True):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            filepath = os.path.join(root, file)
            if filepath.endswith('.pyc') or file == 'rename_and_replace.py':
                continue

            # First, replace text in file
            if replace_text_in_file(filepath):
                modified_files.append(filepath)

            # Then, rename file if necessary
            new_filepath = rename_file(filepath)
            if new_filepath != filepath:
                renamed_files.append(new_filepath)
        
        # Removed directory renaming to avoid topdown issues

    print(f"\nModified text in {len(modified_files)} files.")
    print(f"Renamed {len(renamed_files)} files.")

if __name__ == '__main__':
    main()
