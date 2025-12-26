#!/usr/bin/env python3
"""
生成密码哈希工具
用于生成默认管理员用户的密码哈希值
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.utils.security import hash_password


def main():
    """生成密码哈希"""
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = "123456"  # 默认密码
    
    password_hash = hash_password(password)
    
    print("=" * 60)
    print("密码哈希生成工具")
    print("=" * 60)
    print(f"原始密码: {password}")
    print(f"密码哈希: {password_hash}")
    print("=" * 60)
    print()
    print("SQL 插入语句示例：")
    print(f"INSERT INTO users (id, email, password_hash, role)")
    print(f"VALUES ('admin_001', '51talk', '{password_hash}', 'admin');")
    print("=" * 60)


if __name__ == "__main__":
    main()

