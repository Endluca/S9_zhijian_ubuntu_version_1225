"""
ASR 结果处理脚本
将听悟返回的原始 JSON 转换为结构化文本
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class ASRProcessor:
    """ASR 结果处理器"""

    @staticmethod
    def ms_to_hhmmss(milliseconds: int) -> str:
        """
        将毫秒转换为 HH:MM:SS 格式

        Args:
            milliseconds: 毫秒数

        Returns:
            格式化的时间字符串（如 "00:05:32"）
        """
        seconds = max(0, int(milliseconds // 1000))
        h, rem = divmod(seconds, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    @staticmethod
    def ms_to_hms_text(milliseconds: int) -> str:
        """
        将毫秒转换为中文时长文本

        Args:
            milliseconds: 毫秒数

        Returns:
            中文时长（如 "0小时55分钟21秒"）
        """
        seconds = max(0, int(milliseconds // 1000))
        h, rem = divmod(seconds, 3600)
        m, s = divmod(rem, 60)
        return f"{h}小时{m}分钟{s}秒"

    @staticmethod
    def ms_to_minutes(milliseconds: int) -> str:
        """
        将毫秒转换为分钟数

        Args:
            milliseconds: 毫秒数

        Returns:
            分钟数字符串（如 "55"）
        """
        minutes = int(milliseconds // 60000)
        return str(minutes)

    @staticmethod
    def iter_paragraph_segments(data: dict) -> List[Dict[str, Any]]:
        """
        合并相同说话人的连续段落

        Args:
            data: ASR 结果 JSON

        Returns:
            合并后的段落列表
        """
        paragraphs = data.get("paragraphs") or []
        segments: List[Dict[str, Any]] = []

        current_speaker = None
        current_start_ms = None
        current_text_parts: List[str] = []

        def flush():
            """刷新当前累积的段落"""
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
                # 相同说话人，继续累积
                current_text_parts.append(text)
            else:
                # 不同说话人，刷新并开始新段落
                flush()
                current_speaker = speaker_id
                current_start_ms = start_ms
                current_text_parts = [text]

        flush()
        return segments

    def process(self, asr_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理 ASR 结果，生成格式化文本

        Args:
            asr_json: 听悟返回的原始 JSON

        Returns:
            包含 formatted_text 和 duration 的字典
            {
                "formatted_text": "视频总时长：...\n发言人1,00:00:08,hello\n...",
                "duration": "55"  # 分钟数
            }

        Raises:
            Exception: 处理失败
        """
        try:
            logger.info("[ASRProcessor] 开始处理 ASR 结果")

            # 获取音频信息
            audio_info = asr_json.get("audioInfo") or {}
            duration_ms = int(audio_info.get("duration", 0))

            # 合并段落
            segments = self.iter_paragraph_segments(asr_json)

            # 构建格式化文本
            header = f"视频总时长：{self.ms_to_hms_text(duration_ms)}"
            lines = [header]

            for seg in segments:
                speaker_id = seg["speakerId"]
                start_ts = self.ms_to_hhmmss(seg["startMs"])
                text = seg["text"]
                lines.append(f"发言人{speaker_id},{start_ts},{text}")

            formatted_text = "\n".join(lines)
            duration_minutes = self.ms_to_minutes(duration_ms)

            result = {
                "formatted_text": formatted_text,
                "duration": duration_minutes,
            }

            logger.info(
                f"[ASRProcessor] ✓ 处理完成: "
                f"时长={duration_minutes}分钟, 段落数={len(segments)}"
            )
            return result

        except Exception as e:
            logger.error(f"[ASRProcessor] ✗ 处理失败: {str(e)}")
            raise
