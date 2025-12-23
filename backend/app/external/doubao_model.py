"""
豆包大模型调用脚本
调用豆包视觉大模型进行课堂质量分析
"""
import json
import logging
import re
from typing import Dict, Any, List
from volcenginesdkarkruntime import Ark
from app.config import settings

logger = logging.getLogger(__name__)


class DoubaoModelClient:
    """豆包大模型客户端"""

    def __init__(self):
        self.client = Ark(
            base_url=settings.DOUBAO_BASE_URL,
            api_key=settings.DOUBAO_API_KEY,
        )
        self.model = settings.DOUBAO_MODEL

    def analyze(
        self,
        image_urls: List[str],
        asr_text: str,
        video_id: str = "unknown",
        duration: str = "0"
    ) -> Dict[str, Any]:
        """
        调用豆包模型分析课堂视频

        Args:
            image_urls: OSS 图片 URL 列表
            asr_text: ASR 转录文本
            video_id: 视频 ID
            duration: 视频时长（分钟数）

        Returns:
            包含 thinking 和 result 的字典
            {
                "thinking": "模型的思考过程",
                "result": {...}  # 评估结果 JSON
            }

        Raises:
            Exception: 分析失败
        """
        try:
            logger.info(f"[Doubao] 开始分析视频: video_id={video_id}, 图片数={len(image_urls)}")

            # 构建图片输入
            image_inputs = []
            for url in image_urls:
                image_inputs.append({
                    "type": "input_image",
                    "image_url": url,
                    "detail": "high"
                })

            # 构建完整的 prompt
            prompt_text = self._build_prompt(asr_text, video_id, duration)

            # 调用模型
            response = self.client.responses.create(
                model=self.model,
                input=[
                    {
                        "role": "user",
                        "content": image_inputs + [
                            {
                                "type": "input_text",
                                "text": prompt_text
                            }
                        ]
                    }
                ],
                thinking={
                    "type": "enabled"  # 启用深度思考能力
                }
            )

            logger.debug(f"[Doubao] 模型响应: {response}")

            # 解析响应
            thinking = self._extract_thinking(response)
            result_json = self._extract_result_json(response)

            logger.info(f"[Doubao] ✓ 分析完成")

            return {
                "thinking": thinking,
                "result": result_json
            }

        except Exception as e:
            logger.error(f"[Doubao] ✗ 分析失败: {str(e)}")
            raise

    def _build_prompt(self, asr_text: str, video_id: str, duration: str) -> str:
        """构建完整的 prompt"""
        return f"""##角色定义
你是一位拥有 10 年经验的 51Talk 资深在线英语教学质量监测专家。你具备敏锐的课堂洞察力，擅长通过多模态数据还原教学现场，并依据 51Talk 规定的"考核维度"进行客观、公正的评估。

##任务背景与数据输入
你将接收两类数据作为分析基础：
ASR 文本数据：由课堂音频经语音识别技术转化的逐字稿，带有时间戳。（请注意，文本可能包含少量识别错误，需结合语境判断）。
视觉关键帧：课程录像中截取的静态图片（用于判定）。

### ASR文本数据：
{asr_text}

##画面布局识别
在分析之前，你必须准确识别屏幕布局，以确保将行为归属到正确的人员和部分：
左侧区域：教学课件区（显示单词列表、幻灯片和学习材料）。
右侧上方窗口：教师摄像头窗口。
右侧下方窗口：学生摄像头窗口。

##51Talk 规定的"课堂标准"清单
请严格基于提供的考核维度图片及元数据进行分析。
判定逻辑：如果教师行为符合"正向标准"（即图片或asr文本未出现扣分项行为），标记为 true；如果出现图片或asr文本出现扣分项行为，标记为 false。

A. 课堂准备与规范
虚拟背景使用 (VIRTUAL_BACKGROUND)
标准：教师使用了标准的 51Talk 虚拟背景。
违规判定：教师方未使用 51Talk 虚拟背景。

网络与设备 (DEVICE_NETWORK)
标准：网络环境与设备正常，无回音或延迟。
违规判定：在对话中学生提及教师的发言有回音、延迟等网络环境和设备问题。

课后检测 (POST_CLASS_TEST)
标准：至少有一帧画面需同屏显示"学后检测"标题及单词列表，且列表右侧图标包含红或绿色（全灰即无效），或asr文本中出现对本节课程的复习。
违规判定：未做课后复习或测试。

抗遗忘预约 (RETENTION_BOOKING)
标准：至少一张图片中出现"抗遗忘预约"字样，或asr文本中出现下次的课程预约对话内容。
违规判定：未完成抗遗忘预约。

课程时长达标 (COURSE_DURATION)
标准：课程实际总时长大于 52 分钟。
违规判定：课程实际总时长小于或等于 52 分钟。

B. 课堂行为与状态
教学姿态规范 (TEACHING_POSTURE)
标准：坐姿端正，符合职业规范，露出完整脸部。（注意：教师摄像头窗口在右侧上方窗口）
违规判定：教师方在摄像头前出现托腮、躺卧体态或没有露出完整脸部。

教学行为规范 (TEACHING_BEHAVIOR)
标准：无与教学无关的小动作。
违规判定：教师方在摄像头前出现与教学无关的行为（整理头发、吃东西、玩手机等）。

教学状态 (TEACHING_STATE)
标准：精神饱满，专注教学。
违规判定：明显疲惫、打哈欠、眼神游离。（备注：需结合面部表情识别）

C. 教学互动与反馈
读音纠正 (PRONUNCIATION_CORRECTION)
标准：对学生的读音错误进行及时纠正。
违规判定：当学生读音有问题，教师没有对学生的回答进行读音纠正。

反馈情感 (FEEDBACK_EMOTION)
标准：反馈积极、热情，有实质性内容。教师应对学生的回答保持反馈积极。
违规判定：若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励。

##输出格式
请仅输出原始 JSON 对象，不要包含 Markdown 格式标识。analysis_comment 使用中文填写。
{{
  "class_video_analysis": {{
    "meta_data": {{
      "video_id": "{video_id}",
      "analysis_timestamp": "2025-12-19",
      "duration": "{duration}"
    }},
    "evaluation_results": [
      {{
        "category": "A. 课堂准备与规范",
        "items": [
          {{
            "behavior_code": "VIRTUAL_BACKGROUND",
            "behavior_name": "虚拟背景使用",
            "criteria": "使用了51Talk标准虚拟背景",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "DEVICE_NETWORK",
            "behavior_name": "网络与设备",
            "criteria": "无回音、延迟等设备问题影响教学",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "POST_CLASS_TEST",
            "behavior_name": "课后检测",
            "criteria": "已执行课后检测环节",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "RETENTION_BOOKING",
            "behavior_name": "抗遗忘预约",
            "criteria": "已完成课程最后一步的预约环节",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "COURSE_DURATION",
            "behavior_name": "课程时长达标",
            "criteria": "课程时长大于52分钟即为合规",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }}
        ]
      }},
      {{
        "category": "B. 课堂行为与状态",
        "items": [
          {{
            "behavior_code": "TEACHING_POSTURE",
            "behavior_name": "教学姿态规范",
            "criteria": "无托腮、躺卧体态，同时露出完整脸部",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "TEACHING_BEHAVIOR",
            "behavior_name": "教学行为规范",
            "criteria": "无整理头发、吃东西、玩手机等无关行为",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "TEACHING_STATE",
            "behavior_name": "教学状态",
            "criteria": "无疲惫、打哈欠、眼神游离",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }}
        ]
      }},
      {{
        "category": "C. 教学互动与反馈",
        "items": [
          {{
            "behavior_code": "PRONUNCIATION_CORRECTION",
            "behavior_name": "读音纠正",
            "criteria": "学生读音有问题时进行了纠正",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }},
          {{
            "behavior_code": "FEEDBACK_EMOTION",
            "behavior_name": "反馈情感",
            "criteria": "若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励。",
            "is_compliant": true,
            "evidence_timestamp": [],
            "analysis_comment": ""
          }}
        ]
      }}
    ]
  }}
}}"""

    def _extract_thinking(self, response) -> str:
        """
        从响应中提取 thinking 内容

        Args:
            response: 模型响应对象

        Returns:
            thinking 文本
        """
        try:
            response_str = str(response)

            # 使用正则提取 Summary(text='...') 中的内容
            patterns = [
                r"Summary\(text=['\"](.+?)['\"]\)",
                r"Summary\(text=(['\"])(.+?)\1\)",
            ]

            for pattern in patterns:
                matches = re.findall(pattern, response_str, re.DOTALL)
                if matches:
                    # 如果匹配到多个，取第一个
                    if isinstance(matches[0], tuple):
                        return matches[0][-1] if matches[0] else ""
                    return matches[0]

            logger.warning("[Doubao] 未找到 thinking 内容")
            return ""

        except Exception as e:
            logger.warning(f"[Doubao] 提取 thinking 失败: {str(e)}")
            return ""

    def _extract_result_json(self, response) -> Dict[str, Any]:
        """
        从响应中提取结果 JSON

        Args:
            response: 模型响应对象

        Returns:
            结果 JSON 字典

        Raises:
            Exception: 提取失败
        """
        try:
            response_str = str(response)

            # 使用正则提取 ResponseOutputText(text='...') 中的内容
            patterns = [
                r"ResponseOutputText\(text=['\"](.+?)['\"]\)",
                r"ResponseOutputText\(text=(['\"])(.+?)\1\)",
            ]

            json_text = None
            for pattern in patterns:
                matches = re.findall(pattern, response_str, re.DOTALL)
                if matches:
                    if isinstance(matches[0], tuple):
                        json_text = matches[0][-1] if matches[0] else None
                    else:
                        json_text = matches[0]
                    break

            if not json_text:
                raise Exception("未找到 ResponseOutputText")

            # 清理可能的转义字符
            json_text = json_text.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")

            # 尝试解析 JSON
            # 先尝试找到 JSON 对象的开始和结束
            start_idx = json_text.find('{')
            if start_idx == -1:
                raise Exception("JSON 格式错误：找不到起始大括号")

            # 从后向前找到最后一个 }
            end_idx = json_text.rfind('}')
            if end_idx == -1:
                raise Exception("JSON 格式错误：找不到结束大括号")

            json_text = json_text[start_idx:end_idx + 1]

            # 解析 JSON
            result = json.loads(json_text)

            logger.info("[Doubao] ✓ 成功提取结果 JSON")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"[Doubao] ✗ JSON 解析失败: {str(e)}")
            logger.debug(f"原始文本: {json_text[:500] if json_text else 'None'}")
            raise Exception(f"JSON 解析失败: {str(e)}")
        except Exception as e:
            logger.error(f"[Doubao] ✗ 提取结果失败: {str(e)}")
            raise
