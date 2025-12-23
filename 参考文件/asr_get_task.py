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
    parser.add_argument("--data-id", required=True)
    parser.add_argument("--base-api-url", default=DEFAULT_BASE_API_URL)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    api_key = _require_value(args.api_key, "api_key")

    user_defined_input = {"task": "getTask", "dataId": args.data_id}
    resp = TingWu.call(
        model=args.model,
        user_defined_input=user_defined_input,
        api_key=api_key,
        base_address=args.base_api_url,
    )

    print(json.dumps(resp, ensure_ascii=False))

if __name__ == "__main__":
    main()

