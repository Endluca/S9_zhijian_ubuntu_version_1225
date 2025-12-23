import argparse
import json
import os

from dashscope.multimodal.tingwu.tingwu import TingWu


DEFAULT_BASE_API_URL = (
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
)
DEFAULT_MODEL = "tingwu-meeting"


def _require_value(value: str | None, name: str) -> str:
    if value:
        return value
    raise SystemExit(f"缺少必填参数：{name}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", default=os.getenv("DASHSCOPE_API_KEY"))
    parser.add_argument("--app-id", default=os.getenv("TINGWU_APP_ID"))
    parser.add_argument("--phrase-id", default="")
    parser.add_argument("--base-api-url", default=DEFAULT_BASE_API_URL)
    parser.add_argument("--model", default=DEFAULT_MODEL)

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--file-url")
    input_group.add_argument("--text")
    args = parser.parse_args()

    api_key = _require_value(args.api_key, "api_key")
    app_id = _require_value(args.app_id, "app_id")

    user_defined_input = {
        "task": "createTask",
        "type": "offline",
        "appId": app_id,
        "phraseId": args.phrase_id or "",
    }
    if args.file_url:
        user_defined_input["fileUrl"] = args.file_url
    if args.text:
        user_defined_input["text"] = args.text

    resp = TingWu.call(
        model=args.model,
        user_defined_input=user_defined_input,
        api_key=api_key,
        base_address=args.base_api_url,
        parameters={},
    )

    data_id = None
    if isinstance(resp, dict):
        data_id = (resp.get("output") or {}).get("dataId")

    print(json.dumps({"dataId": data_id, "response": resp}, ensure_ascii=False))


if __name__ == "__main__":
    main()

