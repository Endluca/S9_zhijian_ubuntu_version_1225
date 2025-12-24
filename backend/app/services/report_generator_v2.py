"""
教学质量反馈报告生成器 V2 - 支持动态高度
"""
import io
import logging
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Optional
import requests

logger = logging.getLogger(__name__)


class ReportGenerator:
    """报告生成器"""

    # 违规项的委婉建议模板
    FEEDBACK_TEMPLATES = {
        '虚拟背景使用': '• 建议全程使用 51Talk 标准虚拟背景，营造更专业的教学环境。',
        '网络与设备': '• 建议检查网络环境和设备，确保音视频流畅，避免影响教学体验。',
        '课后检测': '• 建议在课程结束前完成课后检测环节，帮助巩固学习效果。',
        '抗遗忘预约': '• 建议在课程结束前加强"抗遗忘预约"环节的引导，帮助学生养成良好的复习习惯。',
        '课程时长达标': '• 建议确保课程时长达到标准要求（52分钟以上），让学生获得充分的学习时间。',
        '教学姿态规范': '• 建议保持端正的教学姿态，全程露出完整脸部，展现良好的教师形象。',
        '教学行为规范': '• 建议在授课过程中保持专注，避免无关行为，给学生更好的示范。',
        '教学状态': '• 建议保持饱满的教学状态和热情，营造积极向上的课堂氛围。',
        '读音纠正': '• 建议在发现学生读音问题时及时纠正，帮助学生掌握正确发音。',
        '反馈情感': '• 建议增加更多积极的情感反馈和鼓励，激发学生的学习兴趣和自信心。',
    }

    FOOTER_RULES = [
        "教师方应：",
        "1. 全程开启摄像头",
        "2. 使用 51Talk 标准虚拟背景",
        "3. 全程露出肩膀及以上部分",
        "4. 画面不应该亮度过低"
    ]

    def __init__(self, font_path: str = None):
        """初始化报告生成器"""
        font_candidates = [
            font_path,
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/Supplemental/Songti.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/PingFang.ttc",
            "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
            "C:\\Windows\\Fonts\\simhei.ttf",
            "C:\\Windows\\Fonts\\msyh.ttf",
        ]
        
        self.font_path = None
        for candidate in font_candidates:
            if candidate and self._is_valid_font(candidate):
                self.font_path = candidate
                logger.info(f"使用字体: {candidate}")
                break
        
        if not self.font_path:
            logger.warning("未找到中文字体")
    
    def _is_valid_font(self, path: str) -> bool:
        """检查字体文件是否存在"""
        try:
            import os
            return os.path.exists(path)
        except:
            return False

    def _text_wrap(self, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
        """文本自动换行"""
        lines = []
        if not text:
            return []
            
        paragraphs = text.split('\n')
        
        for para in paragraphs:
            current_line = ""
            for char in para:
                test_line = current_line + char
                bbox = font.getbbox(test_line)
                text_w = bbox[2] - bbox[0]
                
                if text_w < max_width:
                    current_line = test_line
                else:
                    lines.append(current_line)
                    current_line = char
            
            if current_line:
                lines.append(current_line)
                
        return lines

    def generate_report(
        self,
        video_id: str,
        student_id: str,
        teacher_name: str,
        class_time: str,
        video_duration: str,
        violations: List[Dict[str, Any]],
        screenshot_url: Optional[str] = None
    ) -> bytes:
        """生成教学质量反馈报告图片（动态高度）"""
        logger.info(f"[ReportGenerator] 开始生成报告: {video_id}")
        
        width = 800
        bg_color = (255, 255, 255)
        max_text_width = width - 100
        
        # 加载字体
        try:
            if self.font_path:
                title_font = ImageFont.truetype(self.font_path, 32)
                text_font = ImageFont.truetype(self.font_path, 24)
                highlight_font = ImageFont.truetype(self.font_path, 24)
                footer_font = ImageFont.truetype(self.font_path, 20)
            else:
                raise OSError("未找到中文字体")
        except OSError:
            title_font = ImageFont.load_default()
            text_font = ImageFont.load_default()
            highlight_font = ImageFont.load_default()
            footer_font = ImageFont.load_default()

        # ===== 第一步：计算所需高度 =====
        y = 50
        
        # 标题
        y += 60
        
        # 基本信息
        y += 10 + 35 * 4 + 30
        
        # 介绍文字
        intro_text = "老师您好！感谢您的精彩授课。为了进一步提升课堂体验，我们为您整理了以下可以优化的小细节："
        intro_lines = self._text_wrap(intro_text, text_font, max_text_width)
        for line in intro_lines:
            bbox = text_font.getbbox(line)
            y += (bbox[3] - bbox[1]) + 15
        y += 20
        
        # 违规建议
        if violations:
            for violation in violations:
                category_name = violation.get('category_name', '')
                feedback = self.FEEDBACK_TEMPLATES.get(
                    category_name,
                    f"• 关于「{category_name}」，建议在后续课堂中可以做得更完整一些。"
                )
                wrapped_lines = self._text_wrap(feedback, highlight_font, max_text_width)
                for line in wrapped_lines:
                    bbox = highlight_font.getbbox(line)
                    y += (bbox[3] - bbox[1]) + 12
                y += 15
        else:
            y += 50
        
        # 截图
        y += 30
        screenshot_img = None
        if screenshot_url:
            try:
                response = requests.get(screenshot_url, timeout=10)
                response.raise_for_status()
                screenshot_img = Image.open(io.BytesIO(response.content))
                screenshot_img.thumbnail((700, 500))
                y += screenshot_img.height
            except:
                y += 300
        else:
            y += 300
        
        # 页脚
        y += 50 + 30 + 40 * len(self.FOOTER_RULES) + 30
        
        total_height = y
        
        # ===== 第二步：创建最终画布并绘制 =====
        img = Image.new('RGB', (width, total_height), color=bg_color)
        draw = ImageDraw.Draw(img)
        
        y_offset = 50
        
        # 1. 标题
        draw.text((50, y_offset), "教学质量反馈报告", font=title_font, fill=(44, 62, 80))
        y_offset += 60
        
        # 2. 基本信息
        y_offset += 10
        info_lines = [
            f"教师姓名：{teacher_name}",
            f"学员ID：{student_id}",
            f"课程时间：{class_time}",
            f"课程时长：{video_duration}"
        ]
        for line in info_lines:
            draw.text((50, y_offset), line, font=text_font, fill=(127, 140, 141))
            y_offset += 35
        
        draw.line([(50, y_offset), (750, y_offset)], fill=(236, 240, 241), width=2)
        y_offset += 30
        
        # 3. 介绍文字
        for line in intro_lines:
            draw.text((50, y_offset), line, font=text_font, fill=(52, 73, 94))
            bbox = text_font.getbbox(line)
            y_offset += (bbox[3] - bbox[1]) + 15
        y_offset += 20
        
        # 4. 违规建议（红色）
        if not violations:
            draw.text((50, y_offset), "本次课堂表现优异，暂无改进建议，请继续保持！", 
                     font=highlight_font, fill=(39, 174, 96))
            y_offset += 50
        else:
            highlight_color = (231, 76, 60)
            for violation in violations:
                category_name = violation.get('category_name', '')
                feedback = self.FEEDBACK_TEMPLATES.get(
                    category_name,
                    f"• 关于「{category_name}」，建议在后续课堂中可以做得更完整一些。"
                )
                wrapped_lines = self._text_wrap(feedback, highlight_font, max_text_width)
                for line in wrapped_lines:
                    draw.text((50, y_offset), line, font=highlight_font, fill=highlight_color)
                    bbox = highlight_font.getbbox(line)
                    y_offset += (bbox[3] - bbox[1]) + 12
                y_offset += 15
        
        # 5. 截图
        y_offset += 30
        if screenshot_img:
            paste_x = (width - screenshot_img.width) // 2
            img.paste(screenshot_img, (paste_x, y_offset))
            y_offset += screenshot_img.height
        else:
            draw.rectangle([50, y_offset, 750, y_offset + 300], outline=(200, 200, 200), width=2)
            draw.text((320, y_offset + 130), "[视频抽帧画面]", font=text_font, fill=(200, 200, 200))
            y_offset += 300
        
        # 6. 页脚
        footer_bg_y = y_offset + 50
        draw.rectangle([0, footer_bg_y, width, total_height], fill=(249, 250, 251))
        
        footer_text_y = footer_bg_y + 30
        for i, rule in enumerate(self.FOOTER_RULES):
            color = (44, 62, 80) if i == 0 else (127, 140, 141)
            draw.text((60, footer_text_y), rule, font=footer_font, fill=color)
            footer_text_y += 40
        
        # 转换为字节流
        output = io.BytesIO()
        img.save(output, format='PNG')
        output.seek(0)
        
        logger.info(f"[ReportGenerator] ✓ 报告生成完成: {video_id}, 高度: {total_height}px")
        return output.getvalue()

    def generate_report_old(
        self,
        video_id: str,
        student_id: str,
        teacher_name: str,
        class_time: str,
        video_duration: str,
        violations: List[Dict[str, Any]],
        screenshot_url: Optional[str] = None
    ) -> bytes:
