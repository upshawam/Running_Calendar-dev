import json
import os
import argparse
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

PACE_CATEGORIES = {
    "Recovery": [r"\brecovery(?!\s*time)\b"],
    "Aerobic": [r"\baerobic\b"],
    "Long/Medium long": [r"\blong\s*/\s*medium\s*long\b", r"\blong\s+/?\s*medium\s+long\b"],
    "Marathon": [r"\bmarathon\b"],
    "Lactate threshold": [r"\blactate\s*threshold\b", r"\bthreshold\b"],
    "VO2max": [r"\bvo\s*2\s*max\b", r"\bvo₂\s*max\b", r"\bvo2max\b"],
}


def _normalize_whitespace(text):
    return ' '.join(text.split())


def _match_category(text):
    lowered = text.lower()
    for category, patterns in PACE_CATEGORIES.items():
        if any(re.search(pattern, lowered, flags=re.IGNORECASE) for pattern in patterns):
            return category
    return None


def _extract_pace_range(text):
    patterns = [
        # e.g. 8:05 - 8:40 /mi
        r'(\d{1,2}:\d{2}(?::\d{2})?\s*(?:-|–|—|to|\.{2,}|…)+\s*\d{1,2}:\d{2}(?::\d{2})?\s*/\s*(?:km|mi))',
        # e.g. 8:05/mi - 8:40/mi
        r'(\d{1,2}:\d{2}(?::\d{2})?\s*/\s*(?:km|mi)\s*(?:-|–|—|to|\.{2,}|…)+\s*\d{1,2}:\d{2}(?::\d{2})?\s*/\s*(?:km|mi))',
        # fallback single pace e.g. 8:05/mi
        r'(\d{1,2}:\d{2}(?::\d{2})?\s*/\s*(?:km|mi))',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return _normalize_whitespace(match.group(1))

    return ""


def _extract_vo2_percent(text):
    match = re.search(r'(\d+\s*[-–]\s*\d+\s*%)|(\d+\s*%)', text)
    if not match:
        return ""
    return re.sub(r'\s+', '', match.group(0))

def auto_login(storage_path, username, password, debug=False):
    """Automatically log in to Runalyze and save storage state."""
    # Force headless mode in CI environments
    is_ci = os.getenv('CI') == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'
    if is_ci:
        debug = False
        print("Running in CI environment, forcing headless mode")
    
    print(f"Starting auto-login for {username}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)
        context = browser.new_context()

        try:
            page = context.new_page()
            print("Navigating to login page...")
            page.goto("https://runalyze.com/login", wait_until="domcontentloaded")

            # Wait for the page to load
            page.wait_for_load_state("networkidle", timeout=30000)
            print("Page loaded, attempting login...")

            # Try multiple selector strategies for username field
            username_selectors = [
                "input[name='username']",
                "input[name='email']",
                "input[type='email']",
                "input[placeholder*='email']",
                "input[placeholder*='Email']",
                "#username",
                "#email",
                ".username",
                ".email"
            ]

            username_field = None
            for selector in username_selectors:
                try:
                    page.wait_for_selector(selector, timeout=5000)
                    username_field = page.query_selector(selector)
                    if username_field:
                        print(f"Found username field with selector: {selector}")
                        break
                except:
                    continue

            if not username_field:
                print("Available input fields:")
                inputs = page.query_selector_all("input")
                for i, inp in enumerate(inputs):
                    print(f"  {i}: {inp.get_attribute('name')} - {inp.get_attribute('type')} - {inp.get_attribute('placeholder')}")
                raise Exception("Could not find username/email input field")

            # Fill username
            username_field.fill(username)
            print("Filled username")

            # Try multiple selector strategies for password field
            password_selectors = [
                "input[name='password']",
                "input[type='password']",
                "#password",
                ".password"
            ]

            password_field = None
            for selector in password_selectors:
                try:
                    password_field = page.query_selector(selector)
                    if password_field:
                        print(f"Found password field with selector: {selector}")
                        break
                except:
                    continue

            if not password_field:
                raise Exception("Could not find password input field")

            # Fill password
            password_field.fill(password)
            print("Filled password")

            # Try multiple selector strategies for submit button
            submit_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Login')",
                "button:has-text('Sign in')",
                "button:has-text('Log in')",
                ".btn-primary",
                "#login-submit"
            ]

            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = page.query_selector(selector)
                    if submit_button:
                        print(f"Found submit button with selector: {selector}")
                        break
                except:
                    continue

            if not submit_button:
                print("Available buttons:")
                buttons = page.query_selector_all("button, input[type='submit']")
                for i, btn in enumerate(buttons):
                    print(f"  {i}: {btn.get_attribute('type')} - {btn.text_content()}")

                raise Exception("Could not find submit button")

            # Click submit and wait for navigation
            submit_button.click()
            print("Clicked submit button")

            # Wait for successful login (either redirect or login success indicator)
            try:
                page.wait_for_url(lambda url: "login" not in url, timeout=30000)
                print("Login successful - redirected away from login page")
            except:
                # Check if we're still on login page (login failed)
                if "login" in page.url:
                    print("Still on login page - login may have failed")
                    # Check for error messages
                    error_selectors = [".alert-danger", ".error", ".login-error", "[class*='error']"]
                    for selector in error_selectors:
                        error_elem = page.query_selector(selector)
                        if error_elem:
                            print(f"Login error: {error_elem.text_content()}")
                            break
                    raise Exception("Login failed - still on login page")
                else:
                    print("Login appears successful")

            # Save storage state
            os.makedirs(os.path.dirname(storage_path), exist_ok=True)
            context.storage_state(path=storage_path)
            print(f"Storage state saved to {storage_path}")

        finally:
            browser.close()

def fetch_data(storage_path, user, output_dir="public/data", debug=False):
    """Fetch training data using saved storage state."""
    # Force headless mode in CI environments
    is_ci = os.getenv('CI') == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'
    if is_ci:
        debug = False
        print("Running in CI environment, forcing headless mode")
    
    print(f"Starting data fetch for {user}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)

        # Load storage state if it exists
        context_options = {}
        if os.path.exists(storage_path):
            context_options["storage_state"] = storage_path
            print(f"Loaded storage state from {storage_path}")
        else:
            print(f"Storage state file {storage_path} not found, will need to login first")

        context = browser.new_context(**context_options)
        page = context.new_page()

        try:
            # Fetch training paces
            print("Fetching training paces...")
            page.goto("https://runalyze.com/dashboard", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=30000)

            # Find the training paces panel specifically (not other panels on dashboard)
            panel_html = None
            try:
                # Look for all panels and find the one with paces data
                panels = page.query_selector_all(".panel")
                print(f"Found {len(panels)} panels on page")
                
                for i, panel in enumerate(panels):
                    panel_inner = panel.inner_html()
                    # Check if this panel contains pace data (look for key pace terms)
                    if ("<strong>Recovery</strong>" in panel_inner or "Recovery" in panel_inner) and \
                       ("<strong>Aerobic</strong>" in panel_inner or "Aerobic" in panel_inner):
                        # Found the paces panel!
                        content_div = panel.query_selector(".panel-content")
                        if content_div:
                            panel_html = content_div.inner_html()
                        else:
                            panel_html = panel_inner
                        print(f"Found paces panel at index {i}")
                        break
                
                if not panel_html:
                    print("No panel with pace data found. Checking page content...")
                    page_content = page.content()
                    if "Recovery" in page_content and "Aerobic" in page_content:
                        print("Page contains pace data but not in expected structure")
                    raise Exception("Could not find training paces panel")
                    
            except Exception as e:
                print(f"Error finding paces panel: {e}")
                print("Could not find training paces panel on page")
                raise

            paces = parse_training_paces_html(panel_html)

            allow_empty = os.getenv('ALLOW_EMPTY_PACES', 'false').lower() in ('1', 'true', 'yes')
            min_categories = int(os.getenv('MIN_PACE_CATEGORIES', '4'))
            if len(paces) < min_categories and not allow_empty:
                debug_file = os.path.join('tmp', f'{user}_panel_debug.html')
                os.makedirs(os.path.dirname(debug_file), exist_ok=True)
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(panel_html)
                panel_text_preview = _normalize_whitespace(BeautifulSoup(panel_html, 'html.parser').get_text(' ', strip=True))
                print(f"Panel text preview for {user}: {panel_text_preview[:1200]}")
                raise Exception(
                    f"Parsed only {len(paces)} pace entries for {user} (minimum expected: {min_categories}). "
                    f"Saved panel HTML to {debug_file}. Set ALLOW_EMPTY_PACES=true to bypass this check."
                )

            # Accumulate history
            paces_file = os.path.join(output_dir, f"{user}_paces.json")
            if os.path.exists(paces_file):
                with open(paces_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []

            history.append({
                "date": datetime.now().isoformat(),
                "paces": paces
            })

            with open(paces_file, 'w') as f:
                json.dump(history, f, indent=4)

            print(f"Saved {len(paces)} pace entries to {paces_file}")

        finally:
            browser.close()

def parse_training_paces_html(html_content):
    """Parse training paces from the HTML content of the training paces panel."""
    soup = BeautifulSoup(html_content, 'html.parser')

    paces = {}

    # Strategy 1: legacy structure from <p> tags.
    pace_paragraphs = soup.find_all('p')
    for p in pace_paragraphs:
        strong = p.find('strong')
        span_right = p.find('span', class_='right')
        small = p.find('small')

        if strong and span_right:
            raw_label = _normalize_whitespace(strong.get_text(strip=True))
            pace_type = _match_category(raw_label) or raw_label
            pace_range = _normalize_whitespace(span_right.get_text())
            vo2_percent = _extract_vo2_percent(small.get_text(strip=True) if small else "")

            paces[pace_type] = {
                "pace_range": pace_range,
                "vo2_percent": vo2_percent
            }

    # Strategy 2: table-style rows (newer UI variants).
    for tr in soup.find_all('tr'):
        cells = tr.find_all(['td', 'th'])
        if not cells:
            continue

        row_text = _normalize_whitespace(tr.get_text(' ', strip=True))
        category = _match_category(row_text)
        if not category:
            continue

        pace_range = _extract_pace_range(row_text)
        if not pace_range and len(cells) >= 2:
            pace_range = _extract_pace_range(_normalize_whitespace(cells[1].get_text(' ', strip=True)))
        if not pace_range:
            continue

        paces[category] = {
            "pace_range": pace_range,
            "vo2_percent": _extract_vo2_percent(row_text)
        }

    # Strategy 3: generic text fallback for card/list layouts.
    candidate_lines = set()
    for element in soup.find_all(['p', 'li', 'div', 'span']):
        text = _normalize_whitespace(element.get_text(' ', strip=True))
        if text and ('/km' in text.lower() or '/mi' in text.lower()):
            candidate_lines.add(text)

    for line in candidate_lines:
        category = _match_category(line)
        pace_range = _extract_pace_range(line)
        if category and pace_range and category not in paces:
            paces[category] = {
                "pace_range": pace_range,
                "vo2_percent": _extract_vo2_percent(line)
            }
    
    return paces


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape training data from Runalyze")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Auto-login command
    login_parser = subparsers.add_parser('auto-login', help='Login and save storage state')
    login_parser.add_argument('--storage', required=True, help='Path to save storage state')
    login_parser.add_argument('--username', required=True, help='Runalyze username')
    login_parser.add_argument('--password', required=True, help='Runalyze password')
    login_parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    # Fetch command
    fetch_parser = subparsers.add_parser('fetch', help='Fetch data using saved storage state')
    fetch_parser.add_argument('--storage', required=True, help='Path to load storage state')
    fetch_parser.add_argument('--user', required=True, help='User identifier (aaron or kristin)')
    fetch_parser.add_argument('--output-dir', default='public/data', help='Output directory for JSON files')
    fetch_parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    args = parser.parse_args()

    if args.command == 'auto-login':
        auto_login(args.storage, args.username, args.password, debug=args.debug)
    elif args.command == 'fetch':
        # Ensure output directory exists
        os.makedirs(args.output_dir, exist_ok=True)
        fetch_data(args.storage, args.user, args.output_dir, debug=args.debug)
    else:
        parser.print_help()
