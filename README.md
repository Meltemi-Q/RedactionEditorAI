<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 智能隐私打码工具

基于千问视觉模型的智能隐私打码应用，可以自动识别图片中的敏感信息并进行打码处理。

## 功能特点

- AI 自动识别敏感区域（人脸、身份证号、金额等）
- 自定义打码指令
- 实时预览效果
- 导出打码后的图片

## 本地开发

**前置要求:** Node.js

1. 安装依赖:
   ```bash
   npm install
   ```

2. 配置环境变量:
   - 复制 `.env.example` 为 `.env.local`
   - 设置 `VITE_MODELSCOPE_API_KEY` 为你的 ModelScope API Key
   - 获取 API Key: https://modelscope.cn/

3. 启动开发服务器:
   ```bash
   npm run dev
   ```

## 部署到 Vercel

### 步骤 1: 导入项目

1. 访问 [Vercel](https://vercel.com)
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库

### 步骤 2: 配置环境变量

在项目设置中添加环境变量：

- **Key**: `VITE_MODELSCOPE_API_KEY`
- **Value**: 你的 ModelScope API Key
- **Environment**: 选择 `Production`, `Preview`, `Development` 全部勾选

### 步骤 3: 部署

点击 "Deploy" 按钮，Vercel 会自动构建和部署。

### 步骤 4: 验证

部署完成后，访问 Vercel 提供的域名，测试打码功能是否正常。

## 环境变量说明

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VITE_MODELSCOPE_API_KEY` | ModelScope API 密钥 | https://modelscope.cn/ |

## 技术栈

- React 19
- TypeScript
- Vite
- ModelScope Qwen2.5-VL-72B-Instruct
