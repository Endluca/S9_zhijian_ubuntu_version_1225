#此脚本是将模型的返回结果处理，并提取两部分，需要分别保存至数据库中
import sys


def _read_all_text(path: str | None) -> str:
    if not path or path == "-":
        return sys.stdin.read()
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _read_python_string_literal(s: str, quote_pos: int) -> tuple[str, int]:
    q = s[quote_pos]
    if q not in ("'", '"'):
        raise ValueError("quote_pos must point to a quote char")

    i = quote_pos + 1
    out = []
    while i < len(s):
        ch = s[i]
        if ch == "\\":
            if i + 1 < len(s):
                out.append(s[i])
                out.append(s[i + 1])
                i += 2
                continue
            out.append(ch)
            i += 1
            continue
        if ch == q:
            literal = q + "".join(out) + q
            try:
                value = eval(literal, {"__builtins__": {}}, {})
            except Exception:
                value = literal[1:-1]
            return value, i + 1
        out.append(ch)
        i += 1

    raise ValueError("unterminated python string literal")


def _extract_all(text: str, marker: str) -> list[str]:
    res = []
    i = 0
    while True:
        j = text.find(marker, i)
        if j == -1:
            break
        k = j + len(marker)
        while k < len(text) and text[k].isspace():
            k += 1
        if k >= len(text) or text[k] not in ("'", '"'):
            i = k
            continue
        try:
            val, end = _read_python_string_literal(text, k)
            res.append(val)
            i = end
        except Exception:
            i = k + 1
    return res


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "-"
    raw = _read_all_text(path)

    reasoning_texts = _extract_all(raw, "Summary(text=")
    output_texts = _extract_all(raw, "ResponseOutputText(text=")

    print("=== reasoning.summary[].text ===")
    if reasoning_texts:
        for idx, t in enumerate(reasoning_texts, 1):
            print(f"\n--- #{idx} ---\n{t}")
    else:
        print("(未找到 Summary(text=...) )")

    print("\n=== output_text.ResponseOutputText.text ===")
    if output_texts:
        for idx, t in enumerate(output_texts, 1):
            print(f"\n--- #{idx} ---\n{t}")
    else:
        print("(未找到 ResponseOutputText(text=...) )")


if __name__ == "__main__":
    main()