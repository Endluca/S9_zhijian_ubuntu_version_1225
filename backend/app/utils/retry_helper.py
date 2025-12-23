"""
重试助手
提供网络错误重试装饰器
"""
import time
import functools
import logging
from typing import Callable, List

logger = logging.getLogger(__name__)


def is_network_error(exception: Exception) -> bool:
    """
    判断是否为网络错误

    Args:
        exception: 异常对象

    Returns:
        是否为网络错误
    """
    error_types = [
        "ConnectionError",
        "Timeout",
        "TimeoutError",
        "HTTPError",
        "URLError",
        "RequestException",
        "SSLError",
        "ConnectTimeout",
        "ReadTimeout",
    ]
    exception_type = type(exception).__name__
    exception_str = str(exception).lower()

    # 检查异常类型
    if any(err in exception_type for err in error_types):
        return True

    # 检查异常消息
    network_keywords = [
        "connection",
        "timeout",
        "network",
        "refused",
        "unreachable",
        "timed out",
    ]
    if any(keyword in exception_str for keyword in network_keywords):
        return True

    return False


def retry_on_network_error(max_retries: int = 3, delays: List[int] = None):
    """
    网络错误重试装饰器

    Args:
        max_retries: 最大重试次数（默认 3 次）
        delays: 重试延迟列表（秒），指数退避，默认 [5, 10, 20]

    使用示例:
        @retry_on_network_error(max_retries=3, delays=[5, 10, 20])
        def download_file(url):
            return requests.get(url)
    """
    if delays is None:
        delays = [5, 10, 20]

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            retry_count = 0

            while retry_count <= max_retries:
                try:
                    return func(*args, **kwargs)

                except Exception as e:
                    # 非网络错误，直接抛出
                    if not is_network_error(e):
                        raise

                    # 达到最大重试次数
                    if retry_count >= max_retries:
                        logger.error(
                            f"✗ [{func.__name__}] 达到最大重试次数 ({max_retries})，放弃重试"
                        )
                        raise

                    # 计算延迟时间（指数退避）
                    delay = delays[retry_count] if retry_count < len(delays) else delays[-1]

                    logger.warning(
                        f"⚠ [{func.__name__}] 网络错误 ({type(e).__name__}: {str(e)[:100]}), "
                        f"{delay}秒后重试 (第 {retry_count + 1}/{max_retries} 次)"
                    )

                    time.sleep(delay)
                    retry_count += 1

            raise RuntimeError("Unreachable code")

        return wrapper

    return decorator
