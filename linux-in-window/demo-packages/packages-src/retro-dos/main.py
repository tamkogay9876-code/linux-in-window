# Retro DOS status widget — executed by the LIW python runtime (sandboxed).
import os, json, shutil

def status():
    total, used, free = shutil.disk_usage(os.path.expanduser("~"))
    print("C:\\> linux status")
    print(f"  drive C:   {free // (1024*1024)} MB free")
    print(f"  packages:  {len(os.listdir(os.environ.get('LIW_PKG_DIR', '.')))} files")
    print("System ready.")

if __name__ == "__main__":
    status()
