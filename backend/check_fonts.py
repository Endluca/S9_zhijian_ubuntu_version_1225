"""
检查系统中可用的中文字体
"""
import os
from PIL import Image, ImageDraw, ImageFont

# 候选字体列表
font_candidates = [
    "/System/Library/Fonts/PingFang.ttc",  # macOS PingFang
    "/System/Library/Fonts/STHeiti Medium.ttc",  # macOS 黑体
    "/System/Library/Fonts/Supplemental/Songti.ttc",  # macOS 宋体
    "/System/Library/Fonts/Hiragino Sans GB.ttc",  # macOS 华文黑体
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",  # Linux
    "C:\\Windows\\Fonts\\simhei.ttf",  # Windows 黑体
    "C:\\Windows\\Fonts\\msyh.ttf",  # Windows 微软雅黑
]

print("检查中文字体...")
print("=" * 60)

found_fonts = []
for font_path in font_candidates:
    if os.path.exists(font_path):
        try:
            # 尝试加载字体
            font = ImageFont.truetype(font_path, 24)
            # 测试中文渲染
            img = Image.new('RGB', (100, 50), color='white')
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), "测试中文", font=font, fill='black')
            
            print(f"✓ 找到可用字体: {font_path}")
            found_fonts.append(font_path)
        except Exception as e:
            print(f"✗ 字体存在但无法使用: {font_path}")
            print(f"  错误: {e}")
    else:
        print(f"  字体文件不存在: {font_path}")

print("=" * 60)
if found_fonts:
    print(f"\n推荐使用: {found_fonts[0]}")
else:
    print("\n⚠️  未找到可用的中文字体！")
    print("建议安装中文字体后重试。")

