---
description: 手动执行轻量开发、独立审查、修复与复审闭环
agent: build
subagent: false
---

使用原生 skill 工具显式加载 ID 为 `dev-review-loop` 的共享技能，按其流程在当前主会话执行以下目标；仅将独立审查委派给子 Agent。

本次目标：$ARGUMENTS

若未给出目标，沿用本次会话中已有的明确任务范围；无法确定时先询问目标。调用入口不自动授权所有实施阶段，不在此重复实现共享技能正文。
