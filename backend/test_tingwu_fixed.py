"""
测试听悟 ASR API 配置（已修复）
"""
from dashscope.multimodal.tingwu.tingwu import TingWu

# API 配置
API_KEY = "sk-a00a0cd499f140e2bc7b0f92b54ea9e5"
APP_ID = "tw_TNJASW01IDyF"
MODEL = "tingwu-meeting"
BASE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

# 测试视频URL
VIDEO_URL = "https://record-ali.51talkjr.com/s9_record/record/20251203/2305843009717766590_1764716101_1764719285_9012.mp4"

print("=" * 60)
print("测试听悟 ASR API（已添加 base_address 参数）")
print("=" * 60)
print(f"API Key: {API_KEY[:20]}...")
print(f"APP ID: {APP_ID}")
print(f"Model: {MODEL}")
print(f"Base URL: {BASE_URL}")
print(f"Video URL: {VIDEO_URL[:50]}...")
print()

try:
    print("正在创建 ASR 任务...")

    user_defined_input = {
        "task": "createTask",
        "type": "offline",
        "appId": APP_ID,
        "fileUrl": VIDEO_URL,
        "phraseId": "",
    }

    resp = TingWu.call(
        model=MODEL,
        user_defined_input=user_defined_input,
        api_key=API_KEY,
        base_address=BASE_URL,  # ← 关键修复
        parameters={},
    )

    print("✓ API 调用成功!")
    print(f"响应类型: {type(resp)}")
    print(f"响应内容: {resp}")

    # 提取 dataId
    if isinstance(resp, dict):
        data_id = (resp.get("output") or {}).get("dataId")
        if data_id:
            print(f"✓ 成功获取 data_id: {data_id}")
        else:
            print("✗ 未找到 dataId 字段")
            print("完整 output:", resp.get("output"))

except Exception as e:
    print(f"✗ 错误: {type(e).__name__}")
    print(f"✗ 详细信息: {str(e)}")

    import traceback
    traceback.print_exc()

print()
print("=" * 60)
