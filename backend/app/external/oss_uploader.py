"""
阿里云 OSS 上传脚本
上传分帧图片到阿里云 OSS
"""
import os
import oss2
import logging
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


class OSSUploader:
    """阿里云 OSS 上传器"""

    def __init__(self):
        # 初始化 OSS 客户端
        auth = oss2.Auth(
            settings.OSS_ACCESS_KEY_ID,
            settings.OSS_ACCESS_KEY_SECRET
        )
        self.bucket = oss2.Bucket(
            auth,
            settings.OSS_ENDPOINT,
            settings.OSS_BUCKET_NAME
        )
        self.base_url = settings.OSS_BASE_URL

    def upload_frames(self, frame_paths: List[str], video_id: str) -> List[str]:
        """
        上传分帧图片到 OSS

        Args:
            frame_paths: 本地图片路径列表
            video_id: 视频 ID

        Returns:
            OSS 图片 URL 列表

        Raises:
            Exception: 上传失败
        """
        frame_urls = []

        try:
            logger.info(f"[{video_id}] 开始上传 {len(frame_paths)} 张图片到 OSS")

            for i, local_path in enumerate(frame_paths, 1):
                if not os.path.exists(local_path):
                    logger.warning(f"[{video_id}] ⚠ 文件不存在，跳过: {local_path}")
                    continue

                # OSS 对象名称：frames/{video_id}/frame_001_120s.jpg
                filename = os.path.basename(local_path)
                oss_key = f"frames/{video_id}/{filename}"

                # 上传文件
                logger.debug(f"[{video_id}] 上传图片 {i}/{len(frame_paths)}: {oss_key}")
                self.bucket.put_object_from_file(oss_key, local_path)

                # 构建完整的 URL
                url = f"{self.base_url}/{oss_key}"
                frame_urls.append(url)

            logger.info(f"[{video_id}] ✓ OSS 上传完成: {len(frame_urls)} 张图片")
            return frame_urls

        except Exception as e:
            logger.error(f"[{video_id}] ✗ OSS 上传失败: {str(e)}")
            raise

    def delete_frames(self, video_id: str) -> bool:
        """
        删除 OSS 上的分帧图片

        Args:
            video_id: 视频 ID

        Returns:
            是否删除成功
        """
        try:
            # 列出该视频的所有图片
            prefix = f"frames/{video_id}/"
            objects_to_delete = []

            for obj in oss2.ObjectIterator(self.bucket, prefix=prefix):
                objects_to_delete.append(obj.key)

            if objects_to_delete:
                # 批量删除
                self.bucket.batch_delete_objects(objects_to_delete)
                logger.info(f"[{video_id}] ✓ 删除 OSS 图片: {len(objects_to_delete)} 张")
                return True
            else:
                logger.warning(f"[{video_id}] ⚠ OSS 上没有该视频的图片")
                return False

        except Exception as e:
            logger.error(f"[{video_id}] ✗ 删除 OSS 图片失败: {str(e)}")
            return False

    def check_file_exists(self, oss_key: str) -> bool:
        """
        检查文件是否存在

        Args:
            oss_key: OSS 对象名称

        Returns:
            文件是否存在
        """
        try:
            return self.bucket.object_exists(oss_key)
        except Exception as e:
            logger.error(f"检查文件存在性失败: {oss_key}, 错误: {str(e)}")
            return False
