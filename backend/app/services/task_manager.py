"""
任务管理器
使用队列管理视频处理任务，串行执行
"""
import logging
from queue import Queue
from threading import Thread
from typing import Callable
from sqlalchemy.orm import Session
from app.services.video_processor import VideoProcessor

logger = logging.getLogger(__name__)


class TaskManager:
    """任务管理器 - 串行处理视频任务"""

    _instance = None

    def __new__(cls, *args, **kwargs):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, db_session_factory: Callable[[], Session]):
        """
        初始化任务管理器

        Args:
            db_session_factory: 数据库会话工厂函数
        """
        if hasattr(self, '_initialized'):
            return

        self.db_session_factory = db_session_factory
        self.task_queue = Queue()
        self.worker_thread = None
        self._running = False
        self._initialized = True

        logger.info("[TaskManager] 任务管理器初始化完成")

    def start(self):
        """启动后台工作线程"""
        if self._running:
            logger.warning("[TaskManager] 工作线程已经在运行")
            return

        self._running = True
        self.worker_thread = Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()
        logger.info("[TaskManager] 后台工作线程已启动")

    def stop(self):
        """停止后台工作线程"""
        self._running = False
        logger.info("[TaskManager] 后台工作线程已停止")

    def add_task(self, video_id: str):
        """
        添加任务到队列

        Args:
            video_id: 视频ID
        """
        self.task_queue.put(video_id)
        queue_size = self.task_queue.qsize()
        logger.info(f"[TaskManager] 添加任务: {video_id}, 队列中剩余 {queue_size} 个任务")

    def get_queue_size(self) -> int:
        """获取当前队列大小"""
        return self.task_queue.qsize()

    def _process_queue(self):
        """后台线程：持续处理队列中的任务"""
        logger.info("[TaskManager] 开始处理任务队列")

        while self._running:
            try:
                # 从队列中获取任务（阻塞，超时1秒）
                try:
                    video_id = self.task_queue.get(timeout=1)
                except:
                    # 超时，继续循环
                    continue

                # 创建数据库会话
                db = self.db_session_factory()

                try:
                    logger.info(f"[TaskManager] 开始处理任务: {video_id}")

                    # 创建视频处理器并执行
                    processor = VideoProcessor(db)
                    processor.process_video(video_id)

                    logger.info(f"[TaskManager] ✓ 任务处理完成: {video_id}")

                except Exception as e:
                    logger.error(f"[TaskManager] ✗ 任务处理失败: {video_id}, 错误: {str(e)}")

                finally:
                    # 关闭数据库会话
                    db.close()
                    # 标记任务完成
                    self.task_queue.task_done()

            except Exception as e:
                logger.error(f"[TaskManager] 处理队列时发生错误: {str(e)}")

        logger.info("[TaskManager] 任务队列处理已停止")


# 全局任务管理器实例（在应用启动时初始化）
_task_manager_instance: TaskManager = None


def init_task_manager(db_session_factory: Callable[[], Session]):
    """
    初始化全局任务管理器

    Args:
        db_session_factory: 数据库会话工厂函数
    """
    global _task_manager_instance
    _task_manager_instance = TaskManager(db_session_factory)
    _task_manager_instance.start()
    logger.info("[TaskManager] 全局任务管理器已初始化并启动")


def get_task_manager() -> TaskManager:
    """
    获取全局任务管理器实例

    Returns:
        TaskManager 实例

    Raises:
        RuntimeError: 如果任务管理器未初始化
    """
    global _task_manager_instance
    if _task_manager_instance is None:
        raise RuntimeError("任务管理器未初始化，请先调用 init_task_manager()")
    return _task_manager_instance
