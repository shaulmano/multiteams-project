"""
Run the full test suite and open the HTML report.
Usage:
    python run_tests.py           # all tests, headless
    python run_tests.py --headed  # show browser
    python run_tests.py -m smoke  # only smoke tests
    python run_tests.py -m api    # only API tests (no browser)
"""
import subprocess
import sys
import os
import webbrowser

REPORT = os.path.join(os.path.dirname(__file__), "test-report.html")


def main():
    args = sys.argv[1:]
    cmd = [sys.executable, "-m", "pytest"] + args

    # Inject --headed only if user asked for it and it's not already there
    if "--headed" in args:
        cmd = [sys.executable, "-m", "pytest"] + [a for a in args if a != "--headed"] + ["--headed"]

    print(f"\n{'='*60}")
    print("  Scrum Dashboard — Test Suite")
    print(f"{'='*60}\n")

    result = subprocess.run(cmd, cwd=os.path.dirname(__file__))

    if os.path.exists(REPORT):
        print(f"\nReport: {REPORT}")
        webbrowser.open(f"file:///{REPORT.replace(os.sep, '/')}")

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
