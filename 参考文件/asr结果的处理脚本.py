import argparse
import json
import ssl
import sys
import urllib.error
import urllib.request


def ms_to_hhmmss(milliseconds: int) -> str:
    seconds = max(0, int(milliseconds // 1000))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def ms_to_hms_text(milliseconds: int) -> str:
    seconds = max(0, int(milliseconds // 1000))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}小时{m}分钟{s}秒"


def build_ssl_context(*, insecure: bool, cafile: str | None) -> ssl.SSLContext:
    if insecure:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    return ssl.create_default_context(cafile=cafile)


def fetch_json(url: str, *, insecure: bool = False, cafile: str | None = None) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "python"})
    context = build_ssl_context(insecure=insecure, cafile=cafile)
    try:
        with urllib.request.urlopen(req, timeout=30, context=context) as resp:
            raw = resp.read()
    except urllib.error.URLError as e:
        if (
            not insecure
            and isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError)
        ):
            raise SystemExit(
                "HTTPS 证书校验失败：可使用 `--insecure` 临时跳过校验，或使用 `--cafile /path/to/cacert.pem` 指定 CA 证书。"
            ) from e
        raise
    text = raw.decode("utf-8", errors="replace")
    return json.loads(text)


def iter_paragraph_segments(data: dict) -> list[dict]:
    paragraphs = data.get("paragraphs") or []
    segments: list[dict] = []

    current_speaker = None
    current_start_ms = None
    current_text_parts: list[str] = []

    def flush():
        nonlocal current_speaker, current_start_ms, current_text_parts
        if current_speaker is None or current_start_ms is None:
            current_speaker = None
            current_start_ms = None
            current_text_parts = []
            return
        text = "".join(current_text_parts).strip()
        if text:
            segments.append(
                {
                    "speakerId": current_speaker,
                    "startMs": int(current_start_ms),
                    "text": text,
                }
            )
        current_speaker = None
        current_start_ms = None
        current_text_parts = []

    for p in paragraphs:
        speaker_id = p.get("speakerId")
        words = p.get("words") or []
        if speaker_id is None or not words:
            continue

        start_ms = (words[0] or {}).get("start", 0)
        text = "".join([(w or {}).get("text", "") for w in words]).strip()
        if not text:
            continue

        if current_speaker is None:
            current_speaker = speaker_id
            current_start_ms = start_ms
            current_text_parts = [text]
            continue

        if speaker_id == current_speaker:
            current_text_parts.append(text)
        else:
            flush()
            current_speaker = speaker_id
            current_start_ms = start_ms
            current_text_parts = [text]

    flush()
    return segments


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--one-line", action="store_true")
    parser.add_argument("--insecure", action="store_true")
    parser.add_argument("--cafile", default=None)
    args = parser.parse_args()

    url = args.url.strip()
    data = fetch_json(url, insecure=args.insecure, cafile=args.cafile)
    duration_ms = int(((data.get("audioInfo") or {}).get("duration")) or 0)
    segments = iter_paragraph_segments(data)

    header = f"视频总时长：{ms_to_hms_text(duration_ms)}。"
    lines = [header]

    for seg in segments:
        speaker_id = seg["speakerId"]
        start_ts = ms_to_hhmmss(seg["startMs"])
        text = seg["text"]
        lines.append(f"发言人{speaker_id},{start_ts},{text}")

    if args.one_line:
        sys.stdout.write("。".join(lines))
    else:
        sys.stdout.write("\n".join(lines))


if __name__ == "__main__":
    main()
