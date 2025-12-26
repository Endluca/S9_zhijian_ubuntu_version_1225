#!/usr/bin/env python3
"""
数据库迁移脚本
添加 llm_result_all 字段到 video_info 表
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.database import engine
from app.config import settings


def add_llm_result_all_column():
    """添加 llm_result_all 字段到 video_info 表"""
    print("=" * 60)
    print("开始执行数据库迁移：添加 llm_result_all 字段")
    print("=" * 60)
    print(f"数据库: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'N/A'}")
    print()
    
    try:
        with engine.connect() as conn:
            # 检查字段是否已存在
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'video_info' 
                AND column_name = 'llm_result_all'
            """)
            result = conn.execute(check_query)
            
            if result.fetchone():
                print("✓ 字段 llm_result_all 已存在，跳过添加")
                return True
            
            # 添加字段
            print("正在添加字段 llm_result_all...")
            alter_query = text("ALTER TABLE video_info ADD COLUMN llm_result_all TEXT")
            conn.execute(alter_query)
            conn.commit()
            print("✓ 字段 llm_result_all 已成功添加到 video_info 表")
            
            # 验证字段是否添加成功
            verify_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'video_info' 
                AND column_name = 'llm_result_all'
            """)
            verify_result = conn.execute(verify_query)
            row = verify_result.fetchone()
            
            if row:
                print()
                print("验证结果：")
                print(f"  字段名: {row[0]}")
                print(f"  数据类型: {row[1]}")
                print(f"  允许为空: {row[2]}")
                print()
                print("=" * 60)
                print("✓ 迁移完成！")
                print("=" * 60)
                return True
            else:
                print("✗ 验证失败：字段未找到")
                return False
                
    except Exception as e:
        print(f"✗ 迁移失败: {str(e)}")
        print()
        print("请检查：")
        print("1. 数据库连接配置是否正确")
        print("2. 数据库用户是否有 ALTER TABLE 权限")
        print("3. video_info 表是否存在")
        return False


if __name__ == "__main__":
    success = add_llm_result_all_column()
    sys.exit(0 if success else 1)

