import os
import json
import threading
import functools
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS_DIR = os.path.join(ROOT, "qa", "screenshots")
os.makedirs(SHOTS_DIR, exist_ok=True)

VIEWPORTS = [
    ("360x800", 360, 800),
    ("768x1024", 768, 1024),
    ("1280x720", 1280, 720),
    ("1920x1080", 1920, 1080),
]

CATEGORIES = ["PAPER", "HARDWARE", "SOFTWARE", "EMBEDDATHON"]

def start_server():
    handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
    server = HTTPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, port

def check_overflow(page):
    return page.evaluate("""() => {
        const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
        const card = document.querySelector('.rv-card');
        const cardRect = card ? card.getBoundingClientRect() : null;
        const cardClipped = cardRect ? (cardRect.right > window.innerWidth + 2 || cardRect.left < -2) : false;
        return { docOverflow, cardClipped, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
    }""")

def main():
    server, port = start_server()
    base_url = f"http://127.0.0.1:{port}/test-reveal.html"
    report = {"consoleErrors": [], "pageErrors": [], "checks": [], "failures": []}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for vp_name, w, h in VIEWPORTS:
            context = browser.new_context(viewport={"width": w, "height": h})
            page = context.new_page()
            page.on("console", lambda msg: report["consoleErrors"].append(f"[{vp_name}] {msg.text}") if msg.type == "error" else None)
            page.on("pageerror", lambda err: report["pageErrors"].append(f"[{vp_name}] {str(err)}"))

            page.goto(base_url, wait_until="domcontentloaded")
            page.wait_for_timeout(400)

            # Enable large-text projector mode at 1920x1080
            if vp_name == "1920x1080":
                page.click("#btnProjectorToggle")

            # Test M mute shortcut
            page.keyboard.press("m")
            muted_text = page.text_content("#audioStatusText")
            if muted_text != "MUTED":
                report["failures"].append(f"[{vp_name}] Mute shortcut M failed: got {muted_text}")

            for cat in CATEGORIES:
                page.select_option("#stageCategorySelect", cat)
                page.wait_for_timeout(200)
                page.screenshot(path=os.path.join(SHOTS_DIR, f"{vp_name}_{cat}_welcome.png"))

                # Test 3rd, 2nd, 1st (with End skip to capture revealed card), and Podium
                for step_num, step_name in [(1, "3rd"), (2, "2nd"), (3, "1st"), (4, "podium")]:
                    page.click(f'.btn-teleport-step[data-step="{step_num}"]')
                    page.wait_for_timeout(450)
                    # Capture suspense/elimination grid on 2nd/1st at 1280x720 & 1920x1080
                    if step_num in (2, 3) and vp_name in ("1280x720", "1920x1080"):
                        page.screenshot(path=os.path.join(SHOTS_DIR, f"{vp_name}_{cat}_{step_name}_suspense.png"))
                    if step_num in (1, 2, 3):
                        page.keyboard.press("End")
                        page.wait_for_timeout(350)
                    ov = check_overflow(page)
                    if ov["docOverflow"] or ov["cardClipped"]:
                        report["failures"].append(f"[{vp_name} {cat} {step_name}] overflow={ov}")
                    page.screenshot(path=os.path.join(SHOTS_DIR, f"{vp_name}_{cat}_{step_name}_revealed.png"))
                    report["checks"].append({"vp": vp_name, "cat": cat, "step": step_name, **ov})

            context.close()
        browser.close()

    server.shutdown()
    with open(os.path.join(ROOT, "qa", "layout_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"Checks: {len(report['checks'])}, Failures: {len(report['failures'])}, ConsoleErrors: {len(report['consoleErrors'])}, PageErrors: {len(report['pageErrors'])}")
    if report["failures"] or report["consoleErrors"] or report["pageErrors"]:
        print("FAILURES:", json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
