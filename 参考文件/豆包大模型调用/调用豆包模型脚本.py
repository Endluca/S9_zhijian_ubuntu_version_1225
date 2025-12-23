#此脚本是调用豆包模型的脚本
import os
from volcenginesdkarkruntime import Ark

# 初始化客户端
client = Ark(
    base_url='https://ark.cn-beijing.volces.com/api/v3',
    api_key="fbcbd81e-edc2-4215-9133-b18f1b2a9b7d",
)

# 读取ASR文本内容
with open('asr集合/吴亚男_原文.txt', 'r', encoding='utf-8') as f:
    asr_text = f.read()

# 读取图片URL列表
with open('图片集合/图片url.txt', 'r', encoding='utf-8') as f:
    image_urls = [line.strip() for line in f if line.strip()]

# 构建input_image部分
image_inputs = []
for url in image_urls:
    image_inputs.append({
        "type": "input_image",
        "image_url": url,
        "detail": "high"
    })

# 构建请求
response = client.responses.create(
  model="doubao-seed-1-6-251015",
  input=[
    {
      "role": "user",
      "content": image_inputs + [
        {
          "type": "input_text",
          "text": f"""##角色定义
          你是一位拥有 10 年经验的 51Talk 资深在线英语教学质量监测专家。你具备敏锐的课堂洞察力，擅长通过多模态数据还原教学现场，并依据 51Talk 规定的"考核维度"进行客观、公正的评估。
          ##任务背景与数据输入
          你将接收两类数据作为分析基础：
          ASR 文本数据：由课堂音频经语音识别技术转化的逐字稿，带有时间戳。（请注意，文本可能包含少量识别错误，需结合语境判断）。
          视觉关键帧：课程录像中截取的静态图片（用于判定）。

          ### ASR文本数据：
          {asr_text}

          ##画面布局识别
          在分析之前，你必须准确识别屏幕布局，以确保将行为归属到正确的人员和部分：
          左侧区域：教学课件区（显示单词列表、幻灯片和学习材料）。
          右侧上方窗口：教师摄像头窗口。
          右侧下方窗口：学生摄像头窗口。
          ##51Talk 规定的"课堂标准"清单
          请严格基于提供的考核维度图片及元数据进行分析。
          判定逻辑：如果教师行为符合"正向标准"（即图片或asr文本未出现扣分项行为），标记为 true；如果出现图片或asr文本出现扣分项行为，标记为 false。
          A. 课堂准备与规范
          虚拟背景使用 (VIRTUAL_BACKGROUND)
          标准：教师使用了标准的 51Talk 虚拟背景。
          违规判定：教师方未使用 51Talk 虚拟背景。
          网络与设备 (DEVICE_NETWORK)
          标准：网络环境与设备正常，无回音或延迟。
          违规判定：在对话中学生提及教师的发言有回音、延迟等网络环境和设备问题。
          课后检测 (POST_CLASS_TEST)
          标准：至少有一帧画面需同屏显示"学后检测"标题及单词列表，且列表右侧图标包含红或绿色（全灰即无效），或asr文本中出现对本节课程的复习。
          违规判定：未做课后复习或测试。
          抗遗忘预约 (RETENTION_BOOKING)
          标准：至少一张图片中出现"抗遗忘预约"字样，或asr文本中出现下次的课程预约对话内容。
          违规判定：未完成抗遗忘预约。
          课程时长达标 (COURSE_DURATION)
          标准：课程实际总时长大于 52 分钟。
          违规判定：课程实际总时长小于或等于 52 分钟。
          B. 课堂行为与状态
          教学姿态规范 (TEACHING_POSTURE)
          标准：坐姿端正，符合职业规范，露出完整脸部。（注意：教师摄像头窗口在右侧上方窗口）
          违规判定：教师方在摄像头前出现托腮、躺卧体态或没有露出完整脸部。
          教学行为规范 (TEACHING_BEHAVIOR)
          标准：无与教学无关的小动作。
          违规判定：教师方在摄像头前出现与教学无关的行为（整理头发、吃东西、玩手机等）。
          教学状态 (TEACHING_STATE)
          标准：精神饱满，专注教学。
          违规判定：明显疲惫、打哈欠、眼神游离。（备注：需结合面部表情识别）
          C. 教学互动与反馈
          读音纠正 (PRONUNCIATION_CORRECTION)
          标准：对学生的读音错误进行及时纠正。
          违规判定：当学生读音有问题，教师没有对学生的回答进行读音纠正。
          反馈情感 (FEEDBACK_EMOTION)
          标准：反馈积极、热情，有实质性内容。教师应对学生的回答保持反馈积极。
          违规判定：若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励。
          ##输出格式
          请仅输出原始 JSON 对象，不要包含 Markdown 格式标识。analysis_comment 使用中文填写。
          JSON
          {{
            "class_video_analysis": {{
              "meta_data": {{
                "video_id": "吴亚男_课堂视频",
                "analysis_timestamp": "2025-12-18",
                "duration": "55"
              }},
              "evaluation_results": [
                {{
                  "category": "A. 课堂准备与规范",
                  "items": [
                    {{
                      "behavior_code": "VIRTUAL_BACKGROUND",
                      "behavior_name": "虚拟背景使用",
                      "criteria": "使用了51Talk标准虚拟背景",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "DEVICE_NETWORK",
                      "behavior_name": "网络与设备",
                      "criteria": "无回音、延迟等设备问题影响教学",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "POST_CLASS_TEST",
                      "behavior_name": "课后检测",
                      "criteria": "已执行课后检测环节",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "RETENTION_BOOKING",
                      "behavior_name": "抗遗忘预约",
                      "criteria": "已完成课程最后一步的预约环节",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "COURSE_DURATION",
                      "behavior_name": "课程时长达标",
                      "criteria": "课程时长大于52分钟即为合规",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": "根据ASR文本显示，课程时长为55分钟，符合大于52分钟的要求"
                    }}
                  ]
                }},
                {{
                  "category": "B. 课堂行为与状态",
                  "items": [
                    {{
                      "behavior_code": "TEACHING_POSTURE",
                      "behavior_name": "教学姿态规范",
                      "criteria": "无托腮、躺卧体态，同时露出完整脸部",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "TEACHING_BEHAVIOR",
                      "behavior_name": "教学行为规范",
                      "criteria": "无整理头发、吃东西、玩手机等无关行为",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "TEACHING_STATE",
                      "behavior_name": "教学状态",
                      "criteria": "无疲惫、打哈欠、眼神游离",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }}
                  ]
                }},
                {{
                  "category": "C. 教学互动与反馈",
                  "items": [
                    {{
                      "behavior_code": "PRONUNCIATION_CORRECTION",
                      "behavior_name": "读音纠正",
                      "criteria": "学生读音有问题时进行了纠正",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }},
                    {{
                      "behavior_code": "FEEDBACK_EMOTION",
                      "behavior_name": "反馈情感",
                      "criteria": "若在课堂中，少于15次显性肯定表达或赞赏性语句，将被视为缺乏有效鼓励。",
                      "is_compliant": true,
                      "evidence_timestamp": [],
                      "analysis_comment": ""
                    }}
                  ]
                }}
              ]
            }}
          }}"""
        },
      ],
    }
  ],
  thinking={
         # "type": "disabled" # 不使用深度思考能力,
         "type": "enabled" # 使用深度思考能力
         # "type": "auto" # 模型自行判断是否使用深度思考能力
     },
)

print("模型响应：")
print(response)