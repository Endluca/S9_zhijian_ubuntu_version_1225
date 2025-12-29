-- ==========================================
-- 视频课堂质量分析系统 - 数据库初始化脚本
-- ==========================================
-- 说明：此脚本用于初始化项目数据库，包括创建所有表、索引、外键约束和默认数据
-- 执行方式：psql -d video_analysis -f init_database.sql
-- 或：psql -U postgres -d video_analysis < init_database.sql
-- ==========================================

-- 设置时区
SET timezone = 'UTC';

-- ==========================================
-- 1. 创建扩展（如果需要）
-- ==========================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- 如果需要UUID支持

-- ==========================================
-- 2. 删除已存在的表（按依赖顺序，谨慎使用）
-- ==========================================
-- 注意：生产环境请注释掉此部分，避免误删数据
-- DROP TABLE IF EXISTS video_evaluations CASCADE;
-- DROP TABLE IF EXISTS video_transcripts CASCADE;
-- DROP TABLE IF EXISTS video_info CASCADE;
-- DROP TABLE IF EXISTS evaluation_categories CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 3. 创建表
-- ==========================================

-- 3.1 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 视频信息表
CREATE TABLE IF NOT EXISTS video_info (
    video_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    class_time TIMESTAMP NOT NULL,
    video_duration VARCHAR(20),
    original_video_url TEXT NOT NULL,
    frame_urls TEXT,
    asr_raw_json TEXT,
    llm_thinking TEXT,
    llm_result_json TEXT,
    llm_result_all TEXT,
    task_status VARCHAR(20) DEFAULT 'uploaded',
    compliance_status VARCHAR(20) DEFAULT '未质检完成',
    current_step VARCHAR(50),
    step_status TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 转录文本表
CREATE TABLE IF NOT EXISTS video_transcripts (
    video_id VARCHAR(50) PRIMARY KEY,
    formatted_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_transcript_video_id 
        FOREIGN KEY (video_id) 
        REFERENCES video_info(video_id) 
        ON DELETE CASCADE
);

-- 3.4 评估类别表
CREATE TABLE IF NOT EXISTS evaluation_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category VARCHAR(100) NOT NULL,
    behavior_code VARCHAR(50) UNIQUE NOT NULL,
    criteria TEXT,
    display_order INTEGER DEFAULT 0
);

-- 3.5 评估结果表
CREATE TABLE IF NOT EXISTS video_evaluations (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL,
    category_id INTEGER NOT NULL,
    parent_category VARCHAR(50),
    category_name VARCHAR(50),
    is_compliant BOOLEAN,
    evidence_timestamp TEXT,
    analysis_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_evaluation_video_id 
        FOREIGN KEY (video_id) 
        REFERENCES video_info(video_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_video_evaluation_category_id 
        FOREIGN KEY (category_id) 
        REFERENCES evaluation_categories(id) 
        ON DELETE CASCADE
);

-- ==========================================
-- 4. 创建索引
-- ==========================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 视频信息表索引
CREATE INDEX IF NOT EXISTS idx_video_info_student_id ON video_info(student_id);
CREATE INDEX IF NOT EXISTS idx_video_info_teacher_name ON video_info(teacher_name);
CREATE INDEX IF NOT EXISTS idx_video_info_class_time ON video_info(class_time);
CREATE INDEX IF NOT EXISTS idx_video_info_task_status ON video_info(task_status);
CREATE INDEX IF NOT EXISTS idx_video_info_compliance_status ON video_info(compliance_status);
CREATE INDEX IF NOT EXISTS idx_video_status_time ON video_info(task_status, class_time);

-- 评估类别表索引
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_parent_category ON evaluation_categories(parent_category);

-- 评估结果表索引
CREATE INDEX IF NOT EXISTS idx_video_evaluation_video_id ON video_evaluations(video_id);
CREATE INDEX IF NOT EXISTS idx_video_evaluation_category_id ON video_evaluations(category_id);
CREATE INDEX IF NOT EXISTS idx_video_category ON video_evaluations(video_id, category_id);

-- ==========================================
-- 5. 创建更新时间触发器函数
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要自动更新 updated_at 的表创建触发器
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_info_updated_at
    BEFORE UPDATE ON video_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. 插入默认数据
-- ==========================================

-- 6.1 插入默认管理员用户
-- 邮箱: 51talk
-- 密码: 123456
-- 密码哈希值已使用 bcrypt 生成
-- 如需重新生成：python3 scripts/generate_password_hash.py 123456
INSERT INTO users (id, email, password_hash, role)
VALUES (
    'admin_001',
    '51talk',
    '$2b$12$XxA2SD7iPwv3LrPEK6WAuu5dJB/wkO4Ga1edPejIrsR9xyhxkxqtK',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- 6.2 插入评估类别数据（根据实际需求调整）
-- 注意：这里只提供示例，实际类别数据需要根据业务需求填充
INSERT INTO evaluation_categories (category_name, parent_category, behavior_code, criteria, display_order)
VALUES
    -- A. 课堂准备与规范
    ('虚拟背景使用', 'A. 课堂准备与规范', 'VIRTUAL_BACKGROUND', '使用了51Talk标准虚拟背景', 1),
    ('网络与设备', 'A. 课堂准备与规范', 'DEVICE_NETWORK', '无回音、延迟等设备问题影响教学', 2),
    ('课后检测', 'A. 课堂准备与规范', 'POST_CLASS_TEST', '已执行课后检测环节', 3),
    ('抗遗忘预约', 'A. 课堂准备与规范', 'RETENTION_BOOKING', '已完成课程最后一步的预约环节', 4),
    ('课程时长达标', 'A. 课堂准备与规范', 'COURSE_DURATION', '课程时长大于52分钟即为合规', 5),
    ('人像清晰度和完整度', 'A. 课堂准备与规范', 'PORTRAIT_CLARITY', '教师人像清晰且完整', 6),
    -- B. 课堂行为与状态
    ('教学姿态规范', 'B. 课堂行为与状态', 'TEACHING_POSTURE', '无托腮、躺卧体态，同时露出完整脸部', 1),
    ('教学行为规范', 'B. 课堂行为与状态', 'TEACHING_BEHAVIOR', '无整理头发、吃东西、玩手机等无关行为', 2),
    ('教学状态', 'B. 课堂行为与状态', 'TEACHING_STATE', '无疲惫、打哈欠、眼神游离', 3),
    -- C. 教学互动与反馈
    ('读音纠正', 'C. 教学互动与反馈', 'PRONUNCIATION_CORRECTION', '学生读音有问题时进行了纠正', 1),
    ('反馈情感', 'C. 教学互动与反馈', 'FEEDBACK_EMOTION', '若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励', 2)
ON CONFLICT (behavior_code) DO NOTHING;

-- ==========================================
-- 7. 验证脚本执行结果
-- ==========================================

-- 显示创建的表
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 显示创建的索引
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 显示用户数量
SELECT COUNT(*) as user_count FROM users;

-- 显示评估类别数量
SELECT COUNT(*) as category_count FROM evaluation_categories;

-- ==========================================
-- 脚本执行完成
-- ==========================================
-- 提示：
-- 1. 默认管理员账号：邮箱 51talk，密码 123456
-- 2. 请确保已更新默认管理员用户的密码哈希值
-- 3. 评估类别数据可根据实际业务需求调整
-- ==========================================

