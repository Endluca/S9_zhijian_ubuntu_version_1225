-- 视频课堂质量分析系统 - 数据库初始化脚本
-- 数据库类型：PostgreSQL

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. 视频信息表
CREATE TABLE IF NOT EXISTS video_info (
    video_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    class_time TIMESTAMP NOT NULL,
    video_duration VARCHAR(20),
    original_video_url TEXT NOT NULL,

    -- OSS 图片 URL（逗号分隔）
    frame_urls TEXT,

    -- ASR 结果
    asr_raw_json TEXT,

    -- 大模型分析结果
    llm_thinking TEXT,
    llm_result_json TEXT,

    -- 任务状态
    task_status VARCHAR(20) DEFAULT 'pending' CHECK (task_status IN ('pending', 'processing', 'completed', 'failed')),
    current_step VARCHAR(50),
    step_status TEXT,  -- JSON 格式
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_student ON video_info(student_id);
CREATE INDEX IF NOT EXISTS idx_video_teacher ON video_info(teacher_name);
CREATE INDEX IF NOT EXISTS idx_video_class_time ON video_info(class_time);
CREATE INDEX IF NOT EXISTS idx_video_status ON video_info(task_status);
CREATE INDEX IF NOT EXISTS idx_video_status_time ON video_info(task_status, class_time);

-- 3. 转录文本表
CREATE TABLE IF NOT EXISTS video_transcripts (
    video_id VARCHAR(50) PRIMARY KEY REFERENCES video_info(video_id) ON DELETE CASCADE,
    formatted_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 评估类别表
CREATE TABLE IF NOT EXISTS evaluation_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category VARCHAR(100) NOT NULL,
    behavior_code VARCHAR(50) NOT NULL UNIQUE,
    criteria TEXT,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_category_parent ON evaluation_categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_category_code ON evaluation_categories(behavior_code);

-- 5. 评估结果表
CREATE TABLE IF NOT EXISTS video_evaluations (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL REFERENCES video_info(video_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES evaluation_categories(id) ON DELETE CASCADE,
    is_compliant BOOLEAN NOT NULL,
    evidence_timestamp TEXT,
    analysis_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_video_category ON video_evaluations(video_id, category_id);

-- 初始化评估类别数据（10个子类）
INSERT INTO evaluation_categories (category_name, parent_category, behavior_code, criteria, display_order) VALUES
-- A. 课堂准备与规范
('虚拟背景使用', 'A. 课堂准备与规范', 'VIRTUAL_BACKGROUND', '使用了51Talk标准虚拟背景', 1),
('网络与设备', 'A. 课堂准备与规范', 'DEVICE_NETWORK', '无回音、延迟等设备问题影响教学', 2),
('课后检测', 'A. 课堂准备与规范', 'POST_CLASS_TEST', '已执行课后检测环节', 3),
('抗遗忘预约', 'A. 课堂准备与规范', 'RETENTION_BOOKING', '已完成课程最后一步的预约环节', 4),
('课程时长达标', 'A. 课堂准备与规范', 'COURSE_DURATION', '课程时长大于52分钟即为合规', 5),

-- B. 课堂行为与状态
('教学姿态规范', 'B. 课堂行为与状态', 'TEACHING_POSTURE', '无托腮、躺卧体态，同时露出完整脸部', 6),
('教学行为规范', 'B. 课堂行为与状态', 'TEACHING_BEHAVIOR', '无整理头发、吃东西、玩手机等无关行为', 7),
('教学状态', 'B. 课堂行为与状态', 'TEACHING_STATE', '无疲惫、打哈欠、眼神游离', 8),

-- C. 教学互动与反馈
('读音纠正', 'C. 教学互动与反馈', 'PRONUNCIATION_CORRECTION', '学生读音有问题时进行了纠正', 9),
('反馈情感', 'C. 教学互动与反馈', 'FEEDBACK_EMOTION', '若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励', 10)
ON CONFLICT (behavior_code) DO NOTHING;

-- 创建默认管理员账号
-- 邮箱: 51talk
-- 密码: 123456 (bcrypt 加密后的 hash)
INSERT INTO users (id, email, password_hash, role) VALUES
('admin_001', '51talk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5OwGy9XW8dM2y', 'admin')
ON CONFLICT (id) DO NOTHING;

-- 创建更新时间自动更新的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 users 表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 video_info 表添加触发器
DROP TRIGGER IF EXISTS update_video_info_updated_at ON video_info;
CREATE TRIGGER update_video_info_updated_at
    BEFORE UPDATE ON video_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
