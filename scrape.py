import argparse
import asyncio
import json
import re
from pathlib import Path
from urllib.parse import quote

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
DECKS_DIR = ROOT / "public" / "decks"
AUDIO_DIR = ROOT / "src" / "assets" / "audio"
BASE_URL = "https://speecher.org/en/chinese?text="


def load_decks() -> tuple[list[str], dict[Path, dict]]:
    if not DECKS_DIR.is_dir():
        raise FileNotFoundError(f"Deck directory not found: {DECKS_DIR}")

    files = sorted(DECKS_DIR.rglob("*.json"))
    if not files:
        raise FileNotFoundError(f"No JSON decks found in {DECKS_DIR}")

    decks = {file: json.loads(file.read_text(encoding="utf-8")) for file in files}
    words = {
        card["hanzi"].strip()
        for deck in decks.values()
        for card in deck["cards"]
        if card["hanzi"].strip()
    }

    print(f"Found {len(files)} decks and {len(words)} unique words")
    return sorted(words), decks


def update_audio_references(word: str, decks: dict[Path, dict]) -> None:
    filename = filename_for(word)

    for path, deck in decks.items():
        changed = False
        for card in deck["cards"]:
            if card["hanzi"].strip() == word and card.get("audio") != filename:
                card["audio"] = filename
                changed = True

        if changed:
            temporary = path.with_name(path.name + ".tmp")
            try:
                temporary.write_text(
                    json.dumps(deck, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)


def filename_for(word: str) -> str:
    safe_word = re.sub(r"[/\\\x00-\x1f]", "_", word)
    return f"{safe_word}.mp3"


async def scrape(delay: float, headless: bool, limit: int) -> None:
    words, decks = load_decks()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    pending = [
        word
        for word in words
        if not (AUDIO_DIR / filename_for(word)).is_file()
        or (AUDIO_DIR / filename_for(word)).stat().st_size == 0
    ]
    for word in words:
        target = AUDIO_DIR / filename_for(word)
        if target.is_file() and target.stat().st_size > 0:
            update_audio_references(word, decks)

    print(f"{len(words) - len(pending)} already downloaded; {len(pending)} remaining")

    if limit:
        pending = pending[:limit]

    failures: list[dict[str, str]] = []
    downloaded = 0

    async with async_playwright() as playwright:
        for index, word in enumerate(pending, start=1):
            target = AUDIO_DIR / filename_for(word)
            partial = target.with_name(target.name + ".part")
            browser = None
            try:
                browser = await playwright.chromium.launch(headless=headless)
                context = await browser.new_context(accept_downloads=True)
                page = await context.new_page()
                await page.goto(
                    BASE_URL + quote(word, safe=""),
                    wait_until="domcontentloaded",
                    timeout=45000,
                )

                button = page.locator("button.btn.btn-ghost.dl-main")
                await button.wait_for(state="visible", timeout=30000)

                async with page.expect_download(timeout=60000) as download_event:
                    await button.click()

                download = await download_event.value
                failure = await download.failure()
                if failure:
                    raise RuntimeError(failure)

                await download.save_as(partial)
                if partial.stat().st_size == 0:
                    raise RuntimeError("Downloaded file is empty")

                partial.replace(target)
                update_audio_references(word, decks)
                downloaded += 1
                print(f"[{index}/{len(pending)}] Saved {target.name}")
            except Exception as exc:
                failures.append({"hanzi": word, "error": str(exc)})
                print(f"[{index}/{len(pending)}] FAILED {word}: {exc}")
            finally:
                if partial.exists():
                    partial.unlink()
                if browser is not None:
                    await browser.close()

            if delay > 0 and index < len(pending):
                await asyncio.sleep(delay)

    print(f"Completed: {downloaded} downloaded; {len(failures)} failed")

    if failures:
        log = ROOT / "audio_failures.json"
        log.write_text(
            json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Failures written to {log}")
    else:
        (ROOT / "audio_failures.json").unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download audio for Fuxi decks")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    asyncio.run(scrape(args.delay, args.headless, args.limit))


if __name__ == "__main__":
    main()
