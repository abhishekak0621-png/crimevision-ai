"""
CrimeVision AI - Intelligent Server Launcher
Automatically identifies Python runtime and starts CrimeVision AI server.
"""

import sys
import os
import subprocess

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    app_path = os.path.join(base_dir, "app.py")
    
    # Priority list of Python executables
    candidates = [
        sys.executable,
        os.path.expandvars(r"%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Python\bin\python.exe"),
        "python",
        "python3"
    ]

    selected_python = None
    for cand in candidates:
        if cand and os.path.isfile(cand):
            selected_python = cand
            break

    if not selected_python:
        selected_python = "python"

    print("==================================================================")
    print("  CRIMEVISION AI: INTELLIGENT MULTIMODAL FORENSIC PLATFORM")
    print("==================================================================")
    print(f"[*] Python Interpreter : {selected_python}")
    print(f"[*] Application Server : {app_path}")
    print("[*] Launching Cockpit at http://127.0.0.1:5000")
    print("==================================================================")

    try:
        subprocess.run([selected_python, app_path], check=True)
    except KeyboardInterrupt:
        print("\n[+] CrimeVision AI platform shut down cleanly.")

if __name__ == "__main__":
    main()
