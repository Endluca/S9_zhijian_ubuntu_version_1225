"""
视频分帧脚本
按照特定规则提取关键帧
"""
import os
import cv2
import random
import shutil
import logging
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


class FrameExtractor:
    """视频分帧器 - 按照特定规则提取关键帧"""

    def __init__(self):
        self.temp_dir = settings.TEMP_FRAMES_DIR
        # 确保临时目录存在
        os.makedirs(self.temp_dir, exist_ok=True)

    def extract(self, video_path: str, video_id: str) -> List[str]:
        """
        按规则提取关键帧

        分帧规则：
        - 10分钟处：随机抽 1 张（0-600秒之间）
        - 20分钟处：随机抽 1 张（600-1200秒之间）
        - 20分钟后：每10分钟抽3张（间隔3分钟，如30分、33分、36分）
        - 结尾前5秒：抽 1 张

        Args:
            video_path: 视频文件路径
            video_id: 视频 ID

        Returns:
            分帧图片路径列表

        Raises:
            ValueError: 视频文件无法打开
            Exception: 分帧失败
        """
        frames_dir = os.path.join(self.temp_dir, video_id)
        os.makedirs(frames_dir, exist_ok=True)

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"无法打开视频文件: {video_path}")

            # 获取视频属性
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_seconds = total_frames / fps

            logger.info(
                f"[{video_id}] 视频信息: FPS={fps:.2f}, "
                f"总帧数={total_frames}, 时长={duration_seconds:.2f}秒"
            )

            frame_paths = []
            frame_count = 0

            def extract_frame_at_second(second: float) -> None:
                """在指定秒数提取帧"""
                nonlocal frame_count

                frame_number = int(second * fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()

                if ret:
                    frame_count += 1
                    # 文件名格式：frame_001_120s.jpg（第1帧，120秒处）
                    frame_filename = f"frame_{frame_count:03d}_{int(second)}s.jpg"
                    frame_path = os.path.join(frames_dir, frame_filename)
                    cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    frame_paths.append(frame_path)
                    logger.debug(f"[{video_id}] 提取帧: {second:.2f}秒 -> {frame_filename}")
                else:
                    logger.warning(f"[{video_id}] ⚠ 无法提取帧: {second:.2f}秒")

            # 规则1：10分钟处随机抽1张（0-600秒之间）
            if duration_seconds >= 600:
                random_second = random.uniform(0, 600)
                extract_frame_at_second(random_second)
                logger.debug(f"[{video_id}] 规则1：10分钟处随机抽帧 -> {random_second:.2f}秒")

            # 规则2：20分钟处随机抽1张（600-1200秒之间）
            if duration_seconds >= 1200:
                random_second = random.uniform(600, 1200)
                extract_frame_at_second(random_second)
                logger.debug(f"[{video_id}] 规则2：20分钟处随机抽帧 -> {random_second:.2f}秒")

            # 规则3：20分钟后，每10分钟抽3张（间隔3分钟）
            # 例如：30分、33分、36分；40分、43分、46分
            if duration_seconds > 1200:
                current_minute = 30
                while current_minute * 60 < duration_seconds - 5:
                    for offset in [0, 3, 6]:
                        second = (current_minute + offset) * 60
                        if second < duration_seconds - 5:
                            extract_frame_at_second(second)
                    current_minute += 10
                logger.debug(f"[{video_id}] 规则3：20分钟后每10分钟抽3帧")

            # 规则4：结尾前5秒抽1张
            if duration_seconds > 5:
                end_second = duration_seconds - 5
                extract_frame_at_second(end_second)
                logger.debug(f"[{video_id}] 规则4：结尾前5秒抽帧 -> {end_second:.2f}秒")

            cap.release()

            logger.info(f"[{video_id}] ✓ 分帧完成: 提取了 {len(frame_paths)} 张图片")
            return frame_paths

        except Exception as e:
            logger.error(f"[{video_id}] ✗ 分帧失败: {str(e)}")
            # 清理可能生成的不完整文件
            if os.path.exists(frames_dir):
                try:
                    shutil.rmtree(frames_dir)
                except Exception:
                    pass
            raise

    def delete_frames(self, video_id: str) -> bool:
        """
        删除本地分帧图片

        Args:
            video_id: 视频 ID

        Returns:
            是否删除成功
        """
        frames_dir = os.path.join(self.temp_dir, video_id)

        try:
            if os.path.exists(frames_dir):
                shutil.rmtree(frames_dir)
                logger.info(f"[{video_id}] ✓ 清理图片文件: {frames_dir}")
                return True
            else:
                logger.warning(f"[{video_id}] ⚠ 图片目录不存在: {frames_dir}")
                return False
        except Exception as e:
            logger.error(f"[{video_id}] ✗ 清理图片失败: {str(e)}")
            return False
