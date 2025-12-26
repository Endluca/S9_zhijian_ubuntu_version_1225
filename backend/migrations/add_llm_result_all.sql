-- 添加 llm_result_all 字段到 video_info 表
-- 执行时间: 2025-01-XX
-- 说明: 用于保存大模型的完整返回内容，便于解析失败时调试

-- 检查字段是否已存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'video_info' 
        AND column_name = 'llm_result_all'
    ) THEN
        ALTER TABLE video_info ADD COLUMN llm_result_all TEXT;
        RAISE NOTICE '字段 llm_result_all 已成功添加到 video_info 表';
    ELSE
        RAISE NOTICE '字段 llm_result_all 已存在，跳过添加';
    END IF;
END $$;

