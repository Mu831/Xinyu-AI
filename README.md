# 心屿 (Xinyu) - 基于双 Agent 的 AI 情绪陪伴应用

## 1. 项目介绍
本项目是一款针对大学生及初入职场的年轻人设计的 AI 情绪陪伴应用。通过记录日常情绪日记，前端利用 ECharts 渲染动态情绪雷达图。同时，引入“感性”与“理性”双 Agent 协同机制，为用户提供多视角的情感共情与理性建议。

## 2. 在线演示地址
🔗 **公网体验链接**：https://xinyu-ai-demo-mu831.netlify.app/
*(注：因使用了免费云端服务器，首次打开若遇后端冷启动，请耐心等待几十秒)*

## 3. 技术架构
本项目采用前后端分离架构：
* **前端**：Vue3 + Vite + Tailwind CSS + ECharts
* **后端**：Node.js + Express
* **大模型**：DeepSeek API
* **安全隔离**：本地开发采用 `.env` 环境变量管理 API Key，确保密钥不暴露。

## 4. 本地安装运行指南
请确保电脑已安装 Node.js (v18+)。
**前端启动：**
1. `cd frontend`
2. `npm install`
3. `npm run dev` (访问 http://localhost:5173)

**后端启动：**
1. `cd backend`
2. `npm install`
3. 在 `backend` 目录下新建 `.env` 文件（参考 `.env.example` 模板），填入 `DEEPSEEK_API_KEY`。
4. `node server.js` (服务运行在 http://localhost:3000)

## 5. 团队信息
* 开发者：郑梓昕
* 参赛赛道：AI创新应用挑战赛
