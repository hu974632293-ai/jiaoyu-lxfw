# 部署交付运行手册

本文档用于 V3 部署交付批次，覆盖后端、前端、环境变量、Dify、MySQL、Alembic、健康检查、生产初始化、演示 seed、备份和恢复。当前批次不改真实线上配置，不要求真实 Dify key。

## 1. 交付边界

- 不在仓库中提交真实密钥、真实数据库密码或真实 Dify key。
- 不把 `POST /api/demo/seed` 当成生产初始化步骤；它只用于验收和演示数据。
- 不迁移既有 SQLite 历史数据；如需迁移，必须另开数据迁移方案。
- 不引入新的部署平台，继续按 FastAPI、Vite、MySQL/Alembic 和现有启动方式交付。

## 2. 环境变量

后端环境变量以 `backend/.env.example` 为模板复制到 `backend/.env`：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
Copy-Item .env.example .env
```

关键项：

| 变量 | 用途 | 生产要求 |
| --- | --- | --- |
| `APP_ENV` | 应用运行环境 | 生产使用 `production` |
| `DATABASE_URL` | 数据库连接 | 生产使用 MySQL 连接串并带 `charset=utf8mb4` |
| `JWT_SECRET_KEY` | token 签名密钥 | 必须替换为高强度随机值 |
| `CORS_ORIGINS` | CORS 允许域名 | 填真实前端域名，多个域名用英文逗号分隔 |
| `ALLOW_LEGACY_ACTOR_HEADER` | 旧调试身份头兼容 | 生产应设为 `false` |
| `DIFY_API_BASE` | Dify API 地址 | 真实接入时填写 Dify 服务地址 |
| `DIFY_API_KEY` | Dify 调用密钥 | 真实接入时填写，不能提交到 Git |
| `DIFY_APP_ID_MAP` | Dify 场景到 app 的映射 | 按 `customer_service:app_id` 等格式配置 |
| `LLM_PROVIDER` | 本地 LLM/provider 标识 | 未接入外部模型时保持 `rule_only` |

前端环境变量以 `frontend/.env.example` 为模板复制到 `frontend/.env`，生产构建前把 `VITE_API_BASE` 改为后端 API 域名。

## 3. MySQL 与 Alembic

创建生产库时使用 `utf8mb4`：

```sql
CREATE DATABASE IF NOT EXISTS jiaoyu_lxfw
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

连接预检：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python scripts\mysql_readiness_check.py --database-url "mysql+pymysql://用户名:密码@127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4"
```

生产建表以 Alembic 为准：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic upgrade head
python -m alembic current
python -m alembic heads
```

`current` 和 `heads` 应指向同一个 head。当前 baseline 以 `docs/mysql-migration-readiness.md` 记录为准。

## 4. 后端启动

开发启动可继续使用：

```powershell
.\start-backend.bat
```

生产启动建议在 `backend` 目录执行：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

日志建议由进程管理器或部署平台收集 stdout/stderr。Windows 本机验收时可先重定向到日志文件：

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 *> logs\backend.log
```

首次使用日志目录前先创建：

```powershell
New-Item -ItemType Directory -Force logs
```

## 5. 前端启动

开发启动可继续使用：

```powershell
.\start-frontend.bat
```

生产构建：

```powershell
cd D:\00_Project\jiaoyu_lxfw\frontend
npm.cmd install
npm.cmd run build
```

构建产物在 `frontend/dist`。部署到静态服务时，需要把所有前端路由回退到 `index.html`，并确保 `VITE_API_BASE` 指向后端 API 域名。

## 6. CORS 与域名

后端读取 `CORS_ORIGINS` 控制允许来源。生产上线前至少确认：

- 前端访问域名已写入 `CORS_ORIGINS`。
- 协议、域名和端口完全匹配，例如 `https://admin.example.com` 与 `http://admin.example.com` 不是同一个 origin。
- 不使用 `*` 承接带登录态的后台请求。

## 7. Dify 配置与 fallback

真实 Dify key、app 和 dataset 不作为本批阻塞。未配置 Dify 时，知识问答、客户研判、报告解释、企业指南和学生生活支持继续返回可解释 fallback，并记录状态，不阻断 CRM、活动、研判和报告主业务。

上线接入 Dify 时：

1. 在 `DIFY_API_BASE` 和 `DIFY_API_KEY` 填真实值。
2. 在 `DIFY_APP_ID_MAP` 配置 `customer_service`、`enterprise_guide`、`student_life`、`customer_assessment`、`report_assistant` 对应 app。
3. 用系统治理页或接口检查 `/api/knowledge/dify-health`。
4. 对关键场景做人工问答抽查，确认命中公司信息、业务、政策、FAQ、新人指南、画像规则或报告口径。

## 8. 健康检查

后端启动后执行：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

预期返回 `{ code, msg, data }` envelope，且 `data.status` 为 `ok`。

Dify 配置健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/knowledge/dify-health
```

未配置真实 Dify 时允许返回缺失项，但必须有清晰状态，不应导致主业务启动失败。

## 9. 生产初始化

生产初始化顺序：

1. 配置 `backend/.env`，确认 `APP_ENV=production`。
2. 创建 MySQL 数据库并完成连接预检。
3. 执行 `python -m alembic upgrade head`。
4. 启动后端并检查 `/health`。
5. 构建并部署前端。
6. 创建或导入生产管理员账号、角色和权限数据。
7. 配置 Dify key、app 和资料导入状态。
8. 运行关键链路验收。

演示 seed 边界：

- `POST /api/demo/seed` 只用于本地演示、自动化测试和验收准备。
- 生产环境如需初始化基础权限和管理员账号，应使用独立初始化脚本或受控后台流程，不能把 demo 数据当作真实业务数据。
- 执行演示 seed 前必须确认目标库不是生产库。

## 10. 备份

MySQL 备份示例：

```powershell
mysqldump -u 用户名 -p --default-character-set=utf8mb4 jiaoyu_lxfw > backups\jiaoyu_lxfw_%DATE:~0,10%.sql
```

建议：

- 备份文件不提交到 Git。
- 备份前记录应用版本、Alembic head、数据库名和备份时间。
- 报告导出文件如落地到对象存储或文件目录，应与数据库快照使用同一批次编号。

## 11. 恢复

恢复前先在新库或隔离库验证：

```powershell
mysql -u 用户名 -p --default-character-set=utf8mb4 jiaoyu_lxfw_restore < backups\备份文件.sql
```

恢复后检查：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m alembic current
python -m alembic heads
python -m pytest tests/test_api_smoke.py -v
```

只有在隔离库验证通过后，才允许制定正式恢复窗口。正式恢复前必须再次备份当前库。

## 12. 部署交付验证命令

本批最小验证：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest tests/test_deployment_delivery.py -v
```

回归验证：

```powershell
cd D:\00_Project\jiaoyu_lxfw\backend
python -m pytest -v
cd D:\00_Project\jiaoyu_lxfw\frontend
npm.cmd run build
cd D:\00_Project\jiaoyu_lxfw
git diff --check
```
