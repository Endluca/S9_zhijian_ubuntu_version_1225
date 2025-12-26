"""
视频处理器核心逻辑
负责完整的9步处理流程
"""
import json
import logging
import time
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.video import VideoInfo
from app.models.transcript import VideoTranscript
from app.models.evaluation import VideoEvaluation
from app.models.category import EvaluationCategory
from app.external.tingwu_asr import TingwuASRClient
from app.external.asr_processor import ASRProcessor
from app.external.video_downloader import VideoDownloader
from app.external.frame_extractor import FrameExtractor
from app.external.oss_uploader import OSSUploader
from app.external.doubao_model import DoubaoModelClient
from app.utils.retry_helper import retry_on_network_error
from app.config import settings

logger = logging.getLogger(__name__)


class VideoProcessor:
    """视频处理核心类 - 负责9步处理流程"""

    def __init__(self, db: Session):
        self.db = db
        self.settings = settings

        # 初始化外部服务客户端
        self.asr_client = TingwuASRClient()
        self.asr_processor = ASRProcessor()
        self.video_downloader = VideoDownloader()
        self.frame_extractor = FrameExtractor()
        self.oss_uploader = OSSUploader()
        self.doubao_client = DoubaoModelClient()

    def process_video(self, video_id: str) -> None:
        """
        完整的9步处理流程
        步骤：ASR → 解析 → 下载 → 分帧 → 删除视频 → 上传OSS → 豆包 → 保存 → 清理

        Args:
            video_id: 视频ID

        Raises:
            Exception: 处理失败
        """
        try:
            logger.info(f"[VideoProcessor] 开始处理视频: {video_id}")

            # 步骤1：听悟 ASR
            self._step_asr(video_id)

            # 步骤2：ASR 结果处理
            self._step_parse_asr(video_id)

            # 步骤3：下载视频
            local_video_path = self._step_download_video(video_id)

            # 步骤4：分帧
            frame_paths = self._step_extract_frames(video_id, local_video_path)

            # 步骤5：删除本地视频
            self._step_delete_video(video_id, local_video_path)

            # 步骤6：上传图片到 OSS
            frame_urls = self._step_upload_oss(video_id, frame_paths)

            # 步骤7：调用豆包模型
            self._step_llm_analysis(video_id, frame_urls)

            # 步骤8：保存结果
            self._step_save_results(video_id)

            # 步骤9：清理本地图片
            self._step_cleanup_files(video_id)

            logger.info(f"[VideoProcessor] ✓ 视频处理完成: {video_id}")

        except Exception as e:
            logger.error(f"[VideoProcessor] ✗ 视频处理失败: {video_id}, 错误: {str(e)}")
            self._handle_error(video_id, str(e))
            raise

    @retry_on_network_error(max_retries=3, delays=[5, 10, 20])
    def _step_asr(self, video_id: str) -> Dict[str, Any]:
        """步骤1：听悟 ASR"""
        self._update_step_status(video_id, "asr", "processing")

        video = self._get_video_info(video_id)
        video_url = video.original_video_url

        logger.info(f"[{video_id}] 步骤1: 调用听悟 ASR")

        # 调用听悟服务（包含创建任务 + 等待完成）
        asr_result = self.asr_client.process_video(video_url)

        # 保存原始 JSON
        video.asr_raw_json = json.dumps(asr_result, ensure_ascii=False)
        self.db.commit()

        self._update_step_status(video_id, "asr", "completed")
        return asr_result

    def _step_parse_asr(self, video_id: str) -> str:
        """步骤2：ASR 结果处理"""
        self._update_step_status(video_id, "parse_asr", "processing")

        video = self._get_video_info(video_id)
        asr_json = json.loads(video.asr_raw_json)

        logger.info(f"[{video_id}] 步骤2: 处理 ASR 结果")

        # 从 output 中提取实际的转录数据
        output = asr_json.get("output", {})
        # 听悟API返回的字段名是 transcriptionPath，不是 result
        result_url = output.get("transcriptionPath") or output.get("result")

        if result_url:
            # 如果有 transcriptionPath URL，需要从 URL 获取完整数据
            import requests
            logger.info(f"[{video_id}] 从 URL 下载转录数据: {result_url[:100]}...")
            response = requests.get(result_url, timeout=30)
            response.raise_for_status()
            transcript_data = response.json()
            logger.info(f"[{video_id}] ✓ 转录数据下载成功，大小: {len(response.text)} 字节")
        else:
            # 直接使用 output 数据
            logger.warning(f"[{video_id}] 未找到 transcriptionPath，使用 output 数据")
            transcript_data = output

        # 处理转录数据
        result = self.asr_processor.process(transcript_data)

        formatted_text = result['formatted_text']
        duration = result['duration']

        # 保存结构化文本和时长
        transcript = VideoTranscript(
            video_id=video_id,
            formatted_text=formatted_text
        )
        self.db.merge(transcript)

        video.video_duration = duration
        self.db.commit()

        self._update_step_status(video_id, "parse_asr", "completed")
        return formatted_text

    @retry_on_network_error(max_retries=3, delays=[5, 10, 20])
    def _step_download_video(self, video_id: str) -> str:
        """步骤3：下载视频"""
        self._update_step_status(video_id, "download", "processing")

        video = self._get_video_info(video_id)
        video_url = video.original_video_url

        logger.info(f"[{video_id}] 步骤3: 下载视频")
        local_path = self.video_downloader.download(video_url, video_id)

        self._update_step_status(video_id, "download", "completed")
        return local_path

    def _step_extract_frames(self, video_id: str, video_path: str) -> list:
        """步骤4：分帧"""
        self._update_step_status(video_id, "extract_frames", "processing")

        logger.info(f"[{video_id}] 步骤4: 视频分帧")
        frame_paths = self.frame_extractor.extract(video_path, video_id)

        self._update_step_status(video_id, "extract_frames", "completed")
        return frame_paths

    def _step_delete_video(self, video_id: str, video_path: str) -> None:
        """步骤5：删除本地视频"""
        logger.info(f"[{video_id}] 步骤5: 删除本地视频")
        self.video_downloader.delete_video(video_id)

    @retry_on_network_error(max_retries=3, delays=[5, 10, 20])
    def _step_upload_oss(self, video_id: str, frame_paths: list) -> list:
        """步骤6：上传图片到 OSS"""
        self._update_step_status(video_id, "upload_oss", "processing")

        logger.info(f"[{video_id}] 步骤6: 上传图片到 OSS")
        frame_urls = self.oss_uploader.upload_frames(frame_paths, video_id)

        # 保存 URL 列表（逗号分隔）
        video = self._get_video_info(video_id)
        video.frame_urls = ",".join(frame_urls)
        self.db.commit()

        self._update_step_status(video_id, "upload_oss", "completed")
        return frame_urls

    @retry_on_network_error(max_retries=3, delays=[5, 10, 20])
    def _step_llm_analysis(self, video_id: str, frame_urls: list) -> Dict[str, Any]:
        """步骤7：调用豆包模型（带解析失败重试）"""
        self._update_step_status(video_id, "llm_analysis", "processing")

        # 获取转录文本和视频时长
        transcript = self.db.query(VideoTranscript).filter_by(video_id=video_id).first()
        if not transcript:
            raise ValueError(f"未找到转录文本: {video_id}")

        video = self._get_video_info(video_id)
        duration = video.video_duration or "0"

        # 解析失败重试逻辑（最多重试2次，加上第一次共3次尝试）
        max_parse_retries = 2
        parse_retry_count = 0
        parse_retry_delays = [3, 5]  # 重试延迟（秒）

        while parse_retry_count <= max_parse_retries:
            try:
                if parse_retry_count > 0:
                    logger.warning(
                        f"[{video_id}] 步骤7: 解析失败，重新调用大模型 "
                        f"(第 {parse_retry_count + 1}/{max_parse_retries + 1} 次尝试)"
                    )
                else:
                    logger.info(f"[{video_id}] 步骤7: 调用豆包模型分析")

                # 调用大模型
                result = self.doubao_client.analyze(
                    frame_urls,
                    transcript.formatted_text,
                    video_id=video_id,
                    duration=duration
                )

                # 先保存完整响应内容（在解析之前）
                raw_response = result.get('raw_response', '')
                video.llm_result_all = raw_response
                self.db.commit()

                # 检查是否有解析错误
                if 'parse_error' in result:
                    parse_error = result.get('parse_error', '未知错误')
                    
                    # 如果还有重试机会
                    if parse_retry_count < max_parse_retries:
                        delay = parse_retry_delays[parse_retry_count] if parse_retry_count < len(parse_retry_delays) else parse_retry_delays[-1]
                        logger.warning(
                            f"[{video_id}] 大模型响应解析失败: {parse_error}，"
                            f"{delay}秒后重试 (第 {parse_retry_count + 1}/{max_parse_retries} 次重试)"
                        )
                        logger.info(f"[{video_id}] 完整响应已保存到 llm_result_all 字段")
                        
                        # 等待后重试
                        time.sleep(delay)
                        parse_retry_count += 1
                        continue
                    else:
                        # 达到最大重试次数，放弃
                        logger.error(
                            f"[{video_id}] ✗ 大模型响应解析失败，已达到最大重试次数 ({max_parse_retries})"
                        )
                        logger.error(f"[{video_id}] 解析错误: {parse_error}")
                        logger.info(f"[{video_id}] 完整响应已保存到 llm_result_all 字段，可用于调试")
                        
                        # 保存错误信息
                        video.error_message = f"大模型响应解析失败（已重试{max_parse_retries}次）: {parse_error}"
                        self.db.commit()
                        raise ValueError(
                            f"大模型响应解析失败（已重试{max_parse_retries}次），完整响应已保存: {parse_error}"
                        )

                # 解析成功，保存结果
                thinking = result.get('thinking', '')
                result_json = result.get('result', {})

                # 保存到数据库
                video.llm_thinking = thinking
                video.llm_result_json = json.dumps(result_json, ensure_ascii=False)
                
                # 如果之前有错误信息，清除它
                if video.error_message and '解析失败' in video.error_message:
                    video.error_message = None
                
                self.db.commit()

                if parse_retry_count > 0:
                    logger.info(f"[{video_id}] ✓ 重试后解析成功")
                else:
                    logger.info(f"[{video_id}] ✓ 分析完成")

                self._update_step_status(video_id, "llm_analysis", "completed")
                return result_json

            except Exception as e:
                # 其他异常（如网络错误）会被 @retry_on_network_error 装饰器处理
                # 解析失败不会抛出异常，而是返回包含 parse_error 的字典，所以这里主要处理其他异常
                raise

    def _step_save_results(self, video_id: str) -> None:
        """步骤8：解析并保存结果"""
        self._update_step_status(video_id, "save_results", "processing")

        video = self._get_video_info(video_id)
        llm_result = json.loads(video.llm_result_json)

        logger.info(f"[{video_id}] 步骤8: 保存评估结果")

        evaluation_results = llm_result["class_video_analysis"]["evaluation_results"]

        # 保存 LLM 自动评估结果
        for category in evaluation_results:
            for item in category["items"]:
                behavior_code = item["behavior_code"]
                is_compliant = item["is_compliant"]
                evidence_timestamp = ",".join(item.get("evidence_timestamp", []))
                analysis_comment = item.get("analysis_comment", "")

                # 查询 category_id
                cat = self.db.query(EvaluationCategory).filter_by(
                    behavior_code=behavior_code
                ).first()

                if not cat:
                    logger.warning(f"[{video_id}] ⚠ 找不到 behavior_code: {behavior_code}")
                    continue

                # 插入评估记录
                evaluation = VideoEvaluation(
                    video_id=video_id,
                    category_id=cat.id,
                    is_compliant=is_compliant,
                    evidence_timestamp=evidence_timestamp,
                    analysis_comment=analysis_comment
                )
                self.db.add(evaluation)

        # 创建人工质检记录（当前仅 PORTRAIT_CLARITY）
        self._create_manual_review_records(video_id)

        # 更新任务状态为待人工质检
        video.task_status = "pending_review"
        self.db.commit()

        self._update_step_status(video_id, "save_results", "completed")

    def _create_manual_review_records(self, video_id: str) -> None:
        """创建需要人工质检的评估记录"""
        # 定义需要人工质检的 behavior_code 列表
        manual_review_codes = ['PORTRAIT_CLARITY']

        for behavior_code in manual_review_codes:
            cat = self.db.query(EvaluationCategory).filter_by(
                behavior_code=behavior_code
            ).first()

            if not cat:
                logger.warning(f"[{video_id}] ⚠ 人工质检类别不存在: {behavior_code}")
                continue

            # 创建待人工评判的记录
            evaluation = VideoEvaluation(
                video_id=video_id,
                category_id=cat.id,
                is_compliant=None,  # NULL 表示待评判
                evidence_timestamp="",
                analysis_comment="待人工评判"
            )
            self.db.add(evaluation)
            logger.info(f"[{video_id}] ✓ 创建人工质检记录: {cat.category_name}")

    def _step_cleanup_files(self, video_id: str) -> None:
        """步骤9：清理本地图片"""
        logger.info(f"[{video_id}] 步骤9: 清理本地图片")
        self.frame_extractor.delete_frames(video_id)

    def _update_step_status(self, video_id: str, step: str, status: str) -> None:
        """更新步骤状态"""
        video = self._get_video_info(video_id)

        # 解析现有 step_status
        step_status = json.loads(video.step_status) if video.step_status else {}
        step_status[step] = status

        video.step_status = json.dumps(step_status)
        video.current_step = step

        if status == "processing":
            video.task_status = "processing"

        self.db.commit()

    def _get_video_info(self, video_id: str) -> VideoInfo:
        """获取视频信息"""
        video = self.db.query(VideoInfo).filter_by(video_id=video_id).first()
        if not video:
            raise ValueError(f"未找到视频: {video_id}")
        return video

    def _handle_error(self, video_id: str, error_message: str) -> None:
        """错误处理"""
        try:
            video = self._get_video_info(video_id)
            video.task_status = "failed"
            video.error_message = error_message
            video.retry_count = (video.retry_count or 0) + 1
            self.db.commit()
        except Exception as e:
            logger.error(f"[{video_id}] 保存错误信息失败: {str(e)}")
