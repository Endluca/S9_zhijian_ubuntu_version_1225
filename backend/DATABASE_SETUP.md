# 数据库初始化指南

本文档说明如何在服务器上初始化项目数据库。

## 📋 前置要求

1. **PostgreSQL 已安装并运行**
   ```bash
   # 检查 PostgreSQL 是否运行
   sudo systemctl status postgresql
   # 或
   psql --version
   ```

2. **数据库用户权限**
   - 确保数据库用户有创建表、索引等权限
   - 建议使用 `postgres` 超级用户或具有相应权限的用户

## 🚀 快速开始

### 方法一：使用 Shell 脚本（推荐）

```bash
cd backend

# 设置数据库连接信息（可选，默认使用环境变量）
export DB_NAME=video_analysis
export DB_USER=postgres
export DB_HOST=localhost
export DB_PORT=5432

# 执行初始化脚本
chmod +x scripts/init_database.sh
./scripts/init_database.sh
```

### 方法二：手动执行 SQL

```bash
# 1. 创建数据库（如果不存在）
createdb video_analysis

# 2. 执行 SQL 脚本
psql -d video_analysis -f init_database.sql

# 或使用特定用户
psql -U postgres -d video_analysis -f init_database.sql
```

### 方法三：在 psql 中执行

```bash
# 连接到数据库
psql -U postgres -d video_analysis

# 在 psql 中执行
\i init_database.sql
```

## 📝 脚本说明

### init_database.sql

完整的数据库初始化脚本，包含：

1. **创建表结构**
   - `users` - 用户表
   - `video_info` - 视频信息表
   - `video_transcripts` - 转录文本表
   - `evaluation_categories` - 评估类别表
   - `video_evaluations` - 评估结果表

2. **创建索引**
   - 单列索引（用于快速查询）
   - 复合索引（用于多条件查询）

3. **创建外键约束**
   - 确保数据完整性

4. **创建触发器**
   - 自动更新 `updated_at` 字段

5. **插入默认数据**
   - 默认管理员用户（邮箱：51talk，密码：123456）
   - 评估类别数据

### scripts/generate_password_hash.py

生成密码哈希的工具脚本：

```bash
# 生成默认密码哈希
python3 scripts/generate_password_hash.py 123456

# 生成自定义密码哈希
python3 scripts/generate_password_hash.py your_password
```

### scripts/init_database.sh

自动化初始化脚本，包含：

- 检查数据库是否存在
- 自动创建数据库（如果不存在）
- 执行 SQL 初始化脚本
- 可选生成密码哈希

## 🔐 默认管理员账号

- **邮箱**: `51talk`
- **密码**: `123456`
- **角色**: `admin`

**⚠️ 重要提示**：
- 生产环境部署后，请立即修改默认管理员密码！
- 密码哈希值已预生成在 `init_database.sql` 中
- 如需重新生成，运行：`python3 scripts/generate_password_hash.py 123456`

## ✅ 验证安装

执行以下 SQL 查询验证数据库初始化是否成功：

```sql
-- 检查表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 检查索引
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 检查默认用户
SELECT id, email, role 
FROM users;

-- 检查评估类别
SELECT COUNT(*) as category_count 
FROM evaluation_categories;
```

预期结果：
- 5 个表：`users`, `video_info`, `video_transcripts`, `evaluation_categories`, `video_evaluations`
- 多个索引（具体数量取决于表结构）
- 1 个默认管理员用户
- 10 个评估类别

## 🔄 更新现有数据库

如果数据库已存在，脚本使用 `CREATE TABLE IF NOT EXISTS` 和 `ON CONFLICT DO NOTHING`，因此可以安全地重复执行。

### 添加新字段

如果需要添加新字段（如 `llm_result_all`），可以使用迁移脚本：

```bash
# 执行迁移脚本
psql -d video_analysis -f migrations/add_llm_result_all.sql

# 或使用 Python 脚本
python3 migrations/run_migration.py
```

## 🐛 常见问题

### 1. 权限不足

**错误**: `permission denied to create database`

**解决**:
```bash
# 使用 postgres 用户
sudo -u postgres psql -d video_analysis -f init_database.sql

# 或授予用户权限
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE video_analysis TO your_user;
```

### 2. 数据库不存在

**错误**: `database "video_analysis" does not exist`

**解决**:
```bash
# 创建数据库
createdb video_analysis

# 或使用 postgres 用户
sudo -u postgres createdb video_analysis
```

### 3. 表已存在

**错误**: `relation "users" already exists`

**解决**:
- 脚本已使用 `IF NOT EXISTS`，不会报错
- 如需重新创建，先删除表（谨慎操作）：
  ```sql
  DROP TABLE IF EXISTS video_evaluations CASCADE;
  DROP TABLE IF EXISTS video_transcripts CASCADE;
  DROP TABLE IF EXISTS video_info CASCADE;
  DROP TABLE IF EXISTS evaluation_categories CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  ```

### 4. 密码哈希错误

**错误**: 无法登录默认管理员账号

**解决**:
```bash
# 重新生成密码哈希
python3 scripts/generate_password_hash.py 123456

# 更新数据库中的密码哈希
psql -d video_analysis -c "UPDATE users SET password_hash = '生成的哈希值' WHERE email = '51talk';"
```

## 📚 相关文档

- [数据库迁移指南](migrations/README.md)
- [项目 README](README.md)

## 🔗 相关文件

- `init_database.sql` - 主初始化脚本
- `scripts/init_database.sh` - 自动化脚本
- `scripts/generate_password_hash.py` - 密码哈希生成工具
- `migrations/` - 数据库迁移脚本目录

