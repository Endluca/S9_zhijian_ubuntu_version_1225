"""
视频下载脚本
从 URL 下载视频到本地临时目录
"""
import os
import requests
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class VideoDownloader:
    """视频下载器"""

    def __init__(self):
        self.temp_dir = settings.TEMP_VIDEO_DIR
        # 确保临时目录存在
        os.makedirs(self.temp_dir, exist_ok=True)

    def download(self, video_url: str, video_id: str) -> str:
        """
        下载视频到本地

        Args:
            video_url: 视频 URL
            video_id: 视频 ID

        Returns:
            本地视频路径

        Raises:
            requests.RequestException: 下载失败
            Exception: 保存失败
        """
        local_path = os.path.join(self.temp_dir, f"{video_id}.mp4")

        try:
            logger.info(f"[{video_id}] 开始下载视频: {video_url}")

            # 流式下载视频
            response = requests.get(
                video_url,
                stream=True,
                timeout=300,  # 5分钟超时
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            response.raise_for_status()

            # 获取文件大小（如果有）
            total_size = int(response.headers.get('content-length', 0))
            downloaded_size = 0

            # 流式写入文件
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)

                        # 每10MB打印一次进度
                        if downloaded_size % (10 * 1024 * 1024) < 8192:
                            if total_size > 0:
                                progress = (downloaded_size / total_size) * 100
                                logger.debug(f"[{video_id}] 下载进度: {progress:.1f}%")
                            else:
                                logger.debug(f"[{video_id}] 已下载: {downloaded_size / 1024 / 1024:.2f} MB")

            file_size_mb = downloaded_size / 1024 / 1024
            logger.info(f"[{video_id}] ✓ 视频下载完成: {local_path}, 大小: {file_size_mb:.2f} MB")
            return local_path

        except requests.RequestException as e:
            logger.error(f"[{video_id}] ✗ 视频下载失败: {str(e)}")
            # 清理可能的不完整文件
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    logger.debug(f"[{video_id}] 已清理不完整的文件")
                except Exception:
                    pass
            raise

        except Exception as e:
            logger.error(f"[{video_id}] ✗ 视频保存失败: {str(e)}")
            # 清理可能的不完整文件
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception:
                    pass
            raise

    def delete_video(self, video_id: str) -> bool:
        """
        删除本地视频文件

        Args:
            video_id: 视频 ID

        Returns:
            是否删除成功
        """
        local_path = os.path.join(self.temp_dir, f"{video_id}.mp4")

        try:
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"[{video_id}] ✓ 删除视频文件: {local_path}")
                return True
            else:
                logger.warning(f"[{video_id}] ⚠ 视频文件不存在: {local_path}")
                return False
        except Exception as e:
            logger.error(f"[{video_id}] ✗ 删除视频失败: {str(e)}")
            return False
