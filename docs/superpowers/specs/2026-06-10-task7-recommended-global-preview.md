# Task 7 推荐组合全局预览

本预览回答“这些风格后续是否能被调用，以及推荐组合落进本项目是否合适”。

## 可复用性

前面输出的风格已经固化为项目文件，可以在后续继续调用：

- 风格说明：`docs/superpowers/specs/2026-06-10-task7-skill-combo-ui-directions.md`
- 自由发挥效果图：`frontend/design-previews/task7-skill-combo-directions.html`
- 效果图截图：`docs/superpowers/specs/task7-style-screenshots/task7-skill-combo-directions-full.png`

后续正式实现时，可以指定单一方向，也可以指定组合，例如“3 的后台 + 2 的管理页 + 1 的官网”。

## 本次推荐组合

本次全局预览采用：

- 官网：首页采用效果图 1「服务策展 Editorial Portal」
- 后台基底：顾问、员工、老师、学生、管理员采用效果图 3「可信台账 Governance Ledger」
- 经营管理：管理者后台吸收效果图 2「智能运营 Command Center」

这样做的原因：

- 官网需要建立信任和服务叙事，不应像内部后台。
- 后台需要长时间办公、审批、审计和数据录入，台账风格更稳。
- 经营管理页需要体现指标、风险和智能报告，适合吸收指挥舱感。

## 预览产物

- 可浏览 HTML：`frontend/design-previews/task7-recommended-global-preview.html`
- 截图：`docs/superpowers/specs/task7-style-screenshots/task7-recommended-global-preview-full.png`

该预览不接入正式前端路由，不改 `frontend/src` 正式页面。确认后再进入正式 React 实现。
