# eo_monitor 的 Copilot 指令

## 架构概述
- **前端**：单页仪表板（`index.html`），使用 ECharts 进行可视化和 Tailwind CSS 进行样式设计。通过 AJAX 从后端 API 端点获取数据。
- **后端**：Node.js Express 服务器（`node-functions/api/[[default]].js`），作为腾讯云 EdgeOne API 的代理。路由映射到特定指标（例如，`/bandwidth` 调用 `DescribeTimingL7OriginPullData`）。
- **数据流**：前端 → 后端 API → 腾讯云 SDK → 指标数据。参考响应示例在 `辅助文件/` 中。
- **关键组件**：指标分组为 ORIGIN_PULL_METRICS（例如，l7Flow_inBandwidth_hy）、TOP_ANALYSIS_METRICS（例如，l7Flow_request_country）、SECURITY_METRICS（例如，ccManage_interceptNum）、FUNCTION_METRICS（例如，function_requestCount）。

## 关键工作流程
- **本地开发**：`npm install`，然后 `node node-functions/api/[[default]].js`（在端口 8088 上运行）。设置环境变量 `SECRET_ID`、`SECRET_KEY`、`SITE_ID`。
- **部署**：使用 EdgeOne Pages：Fork 仓库，连接 GitHub，在控制台中设置环境变量。替代方案：本地 Node.js 服务器。
- **调试**：在路由中记录 API 响应；检查嵌套 JSON 结构（例如，`Response.Data[0].TypeValue[0].Detail` 用于值数组）。

## 项目约定
- **API 集成**：使用腾讯云 SDK 客户端（例如，`TeoClient`、`MonitorClient`）。使用环境变量中的 SecretId/SecretKey 进行身份验证。
- **响应解析**：深度嵌套的 JSON；从 `Detail` 数组中提取值，从 `Sum`/`Max`/`Avg` 字段中提取总和/最大值/平均值。
- **路由**：每个指标类型的 Express GET 路由；直接返回 JSON 数据。
- **依赖**：最小化；使用 `dotenv` 进行配置，`express` 作为服务器。
- **文件结构**：`index.html` 用于 UI，`node-functions/api/` 用于服务器逻辑，`辅助文件/` 用于示例数据。

## 示例
- 添加新指标：在常量中定义（例如，添加到 TOP_ANALYSIS_METRICS），在 `[[default]].js` 中创建路由，调用适当的 API 方法。
- 处理数据：对于带宽，将 `TypeValue[0].Detail` 解析为 {Time, Value} 对象数组。

重点关注腾讯云 API 模式和嵌套响应结构，以提高贡献效率。