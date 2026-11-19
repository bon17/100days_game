"""Build a single-page preview of the game for publishing as a claude.ai artifact.

usage: python3 -I tools/build_preview.py <out.html>

- Inlines css/game.css, every story/*.js and js/engine.js into one HTML file.
- Drops the <!doctype>/<html>/<head>/<body> wrapper lines (the artifact host adds its own).
- Images stay as separate files under assets/ and are published next to the page.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WRAPPERS = ("<!doctype html>", '<html lang="ko">', "<head>", "</head>", "<body>", "</body>", "</html>",
            '<meta charset="utf-8">')


def main():
    out = Path(sys.argv[1])
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css/game.css").read_text(encoding="utf-8").replace("../assets/", "assets/")
    html = html.replace('<link rel="stylesheet" href="css/game.css">', f"<style>\n{css}\n</style>")
    # inline every local script (story/*.js, js/engine.js) in document order
    for src in re.findall(r'<script src="((?:story|js)/[^"]+)"></script>', html):
        code = (ROOT / src).read_text(encoding="utf-8")
        html = html.replace(f'<script src="{src}"></script>', f"<script>\n{code}\n</script>")
    lines = [ln for ln in html.splitlines()
             if ln.strip() not in WRAPPERS and not ln.strip().startswith('<meta name="viewport"')]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(out, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
