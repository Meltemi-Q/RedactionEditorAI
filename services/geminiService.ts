import { BoundingBox } from '../types';

// 使用环境变量中的 ModelScope API Key
const API_KEY = import.meta.env.VITE_MODELSCOPE_API_KEY || '';
const API_URL = "https://api-inference.modelscope.cn/v1/chat/completions";
const MODEL_NAME = "Qwen/Qwen2.5-VL-72B-Instruct"; 

export const detectSensitiveData = async (
  base64Image: string, 
  userInstructions: string
): Promise<BoundingBox[]> => {

  // 优化后的提示词：引入思维链 (CoT) + 少样本提示 (Few-Shot)
  const systemPrompt = `
    你是一个专业的UI视觉分析专家和隐私安全助手。
    你的任务是：根据用户的指令，精准识别图片中的敏感区域，并返回边界框坐标。

    **坐标系定义**:
    - 图片左上角为 (0, 0)，右下角为 (1000, 1000)。
    - 必须输出 **[xmin, ymin, xmax, ymax]** 格式 (即: 左边缘, 上边缘, 右边缘, 下边缘)。

    **分析步骤**:
    1. **布局分析**: 识别图片类型（微信/支付宝/银行卡等），确定左右方位。
    2. **目标定位**: 找到符合指令的所有像素区域。如果是对话气泡，要包含整个气泡背景。
    3. **坐标输出**: 生成归一化坐标。

    **Few-Shot 示例 (请严格模仿此逻辑)**:
    用户指令: "隐藏左侧的头像"
    AI回答:
    {
      "thought": "这是一个微信聊天截图。左侧是对方发送的信息。我定位到了左侧的一个圆形头像区域，位于屏幕左边缘附近，垂直高度居中。",
      "boxes": [
        { "label": "左侧头像", "box_2d": [20, 300, 150, 430] }
      ]
    }

    **用户指令**: "隐藏所有的金额"
    AI回答:
    {
      "thought": "检测到画面中有三处显示金额的文本。一处在顶部余额，两处在转账记录中。",
      "boxes": [
        { "label": "余额", "box_2d": [300, 100, 700, 180] },
        { "label": "转账金额", "box_2d": [500, 400, 650, 450] },
        { "label": "转账金额", "box_2d": [500, 500, 650, 550] }
      ]
    }

    **输出要求**:
    - 只返回 JSON 对象。
    - 不要使用 markdown 代码块。
  `;

  const requestBody = {
    model: MODEL_NAME,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          },
          {
            type: "text",
            text: `指令: "${userInstructions}"。请分析图片并返回 JSON。`
          }
        ]
      }
    ],
    temperature: 0.05, // 进一步降低温度，让它更死板地遵守格式
    stream: false 
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("ModelScope API Error:", err);
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    console.log("Qwen Response:", content);

    // 增强的 JSON 提取逻辑
    let cleanJson = content;
    // 移除 markdown
    cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '');
    // 提取第一个 { ... } 块
    const jsonBlockMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonBlockMatch) {
        cleanJson = jsonBlockMatch[0];
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error. Raw content:", content);
      throw new Error("AI 返回数据解析失败，请尝试简化指令或重试。");
    }

    const rawBoxes = parsedData.boxes || [];

    // 坐标映射与转换
    // Model Output: [xmin, ymin, xmax, ymax]
    // App Type: { xmin, ymin, xmax, ymax }
    const boxes: BoundingBox[] = rawBoxes.map((item: any) => {
        let [x1, y1, x2, y2] = item.box_2d;
        
        // 坐标钳制 (Clamping) 到 0-1000，防止模型输出 1001 这种越界坐标
        x1 = Math.max(0, Math.min(1000, x1));
        y1 = Math.max(0, Math.min(1000, y1));
        x2 = Math.max(0, Math.min(1000, x2));
        y2 = Math.max(0, Math.min(1000, y2));

        return {
            xmin: Math.min(x1, x2),
            ymin: Math.min(y1, y2),
            xmax: Math.max(x1, x2),
            ymax: Math.max(y1, y2),
            label: item.label || "遮罩区域"
        };
    });

    return boxes;

  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "图片分析失败，请稍后重试。");
  }
};