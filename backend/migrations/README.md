# 数据库迁移说明

## 方法一：直接执行 SQL（推荐用于快速迁移）

### 步骤：

1. **连接到 PostgreSQL 数据库**：
```bash
psql -d video_analysis -U postgres
```

或者使用你的数据库连接信息：
```bash
psql "postgresql://user:password@localhost:5432/video_analysis"
```

2. **执行迁移 SQL**：
```bash
psql -d video_analysis -f migrations/add_llm_result_all.sql
```

或者在 psql 中直接执行：
```sql
\i migrations/add_llm_result_all.sql
```

3. **验证字段是否添加成功**：
```sql
\d video_info
```

或者：
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'video_info' 
AND column_name = 'llm_result_all';
```

---

## 方法二：使用 Alembic（推荐用于生产环境）

### 1. 安装 Alembic

```bash
pip install alembic
```

### 2. 初始化 Alembic

```bash
cd backend
alembic init alembic
```

### 3. 配置 Alembic

编辑 `alembic/env.py`，修改数据库连接：

```python
from app.config import settings
from app.database import Base

# 使用项目的数据库配置
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# 导入所有模型
target_metadata = Base.metadata
```

### 4. 创建迁移脚本

```bash
alembic revision --autogenerate -m "add llm_result_all field"
```

### 5. 执行迁移

```bash
alembic upgrade head
```

---

## 方法三：使用 Python 脚本（适合自动化）

创建一个 Python 脚本来执行迁移：

```python
# migrations/run_migration.py
from sqlalchemy import text
from app.database import engine

def add_llm_result_all_column():
    """添加 llm_result_all 字段"""
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
            print("字段 llm_result_all 已存在，跳过添加")
        else:
            # 添加字段
            alter_query = text("ALTER TABLE video_info ADD COLUMN llm_result_all TEXT")
            conn.execute(alter_query)
            conn.commit()
            print("字段 llm_result_all 已成功添加")

if __name__ == "__main__":
    add_llm_result_all_column()
```

执行：
```bash
python migrations/run_migration.py
```

---

## 验证迁移结果

执行以下 SQL 查询验证字段是否添加成功：

```sql
-- 查看表结构
\d video_info

-- 或者查看字段信息
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_info' 
AND column_name = 'llm_result_all';
```

预期结果应该显示：
- column_name: llm_result_all
- data_type: text
- is_nullable: YES
- column_default: NULL

---

## 回滚（如果需要）

如果需要回滚，执行：

```sql
ALTER TABLE video_info DROP COLUMN IF EXISTS llm_result_all;
```

