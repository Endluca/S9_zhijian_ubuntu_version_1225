"""
听悟 ASR 客户端
封装听悟 ASR 服务调用
"""
import logging
import time
from typing import Dict, Any, Optional
from dashscope.multimodal.tingwu.tingwu import TingWu
from app.config import settings

logger = logging.getLogger(__name__)

# 听悟 API 端点
TINGWU_BASE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"


class TingwuASRClient:
    """听悟 ASR 客户端"""

    def __init__(self):
        self.api_key = settings.DASHSCOPE_API_KEY
        self.app_id = settings.TINGWU_APP_ID
        self.model = settings.TINGWU_MODEL
        self.base_url = TINGWU_BASE_URL

        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY 未配置")
        if not self.app_id:
            raise ValueError("TINGWU_APP_ID 未配置")

    def create_task(self, file_url: str, phrase_id: str = "") -> str:
        """
        创建 ASR 转录任务

        Args:
            file_url: 视频文件 URL
            phrase_id: 短语 ID（可选）

        Returns:
            data_id: 任务 ID

        Raises:
            Exception: 创建任务失败
        """
        try:
            logger.info(f"[TingWu] 创建 ASR 任务: {file_url}")

            user_defined_input = {
                "task": "createTask",
                "type": "offline",
                "appId": self.app_id,
                "fileUrl": file_url,
                "phraseId": phrase_id or "",
            }

            resp = TingWu.call(
                model=self.model,
                user_defined_input=user_defined_input,
                api_key=self.api_key,
                base_address=self.base_url,
                parameters={},
            )

            # 提取 dataId
            data_id = None
            if isinstance(resp, dict):
                data_id = (resp.get("output") or {}).get("dataId")

            if not data_id:
                raise Exception(f"创建任务失败，未返回 dataId: {resp}")

            logger.info(f"[TingWu] ✓ 任务创建成功, data_id={data_id}")
            return data_id

        except Exception as e:
            logger.error(f"[TingWu] ✗ 创建任务失败: {str(e)}")
            raise

    def get_task_result(self, data_id: str) -> Dict[str, Any]:
        """
        获取 ASR 任务结果

        Args:
            data_id: 任务 ID

        Returns:
            ASR 结果 JSON

        Raises:
            Exception: 获取结果失败
        """
        try:
            logger.info(f"[TingWu] 获取任务结果: data_id={data_id}")

            user_defined_input = {
                "task": "getTask",
                "dataId": data_id,
            }

            resp = TingWu.call(
                model=self.model,
                user_defined_input=user_defined_input,
                api_key=self.api_key,
                base_address=self.base_url,
            )

            if not isinstance(resp, dict):
                raise Exception(f"获取结果失败，返回格式错误: {resp}")

            logger.info(f"[TingWu] ✓ 获取结果成功")
            return resp

        except Exception as e:
            logger.error(f"[TingWu] ✗ 获取结果失败: {str(e)}")
            raise

    def wait_for_completion(
        self,
        data_id: str,
        max_wait_time: int = 3600,
        poll_interval: int = 10
    ) -> Dict[str, Any]:
        """
        等待任务完成并返回结果

        Args:
            data_id: 任务 ID
            max_wait_time: 最大等待时间（秒），默认 1 小时
            poll_interval: 轮询间隔（秒），默认 10 秒

        Returns:
            ASR 结果 JSON

        Raises:
            TimeoutError: 超时
            Exception: 任务失败
        """
        logger.info(f"[TingWu] 等待任务完成: data_id={data_id}")

        start_time = time.time()
        while True:
            # 检查超时
            elapsed = time.time() - start_time
            if elapsed > max_wait_time:
                raise TimeoutError(f"任务超时（{max_wait_time}秒）")

            # 获取任务状态
            result = self.get_task_result(data_id)
            output = result.get("output") or {}
            status = output.get("status")

            logger.debug(f"[TingWu] 任务状态: {status}, 已等待 {elapsed:.0f}秒")

            # 听悟API状态码：0=成功, 1=处理中, 2=失败
            if status == 0:
                logger.info(f"[TingWu] ✓ 任务完成，用时 {elapsed:.0f}秒")
                return result
            elif status == 2:
                error_msg = output.get("error", "未知错误")
                raise Exception(f"任务失败: {error_msg}")
            elif status != 1:
                logger.warning(f"[TingWu] 未知状态码: {status}, 继续等待...")

            # 继续等待
            time.sleep(poll_interval)

    def process_video(self, video_url: str) -> Dict[str, Any]:
        """
        完整流程：创建任务 → 等待完成 → 返回结果

        Args:
            video_url: 视频 URL

        Returns:
            ASR 结果 JSON

        Raises:
            Exception: 处理失败
        """
        # 创建任务
        data_id = self.create_task(video_url)

        # 等待完成
        result = self.wait_for_completion(data_id)

        return result
