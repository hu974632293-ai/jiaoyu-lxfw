# MySQL 迁移准备清单

本文档用于把当前 SQLite 业务基线迁移到 MySQL 前的准备事项固化为可执行检查。当前阶段只做迁移准备，不直接切换数据库，不迁移历史数据。

## 1. 当前 SQLite 基线

- 配置入口：`backend/app/core/config.py`
- 默认连接串：`sqlite:///./app.db`
- 当前数据库文件：`D:\00_Project\jiaoyu_lxfw\backend\app.db`
- 当前验证命令：
  - `cd D:\00_Project\jiaoyu_lxfw\backend`
  - `python -m pytest -v`
  - `cd D:\00_Project\jiaoyu_lxfw\frontend`
  - `npm.cmd run build`

SQLite 业务基线通过，只能说明当前业务接口、测试数据和前端构建在 SQLite 下可用，不能直接等同于 MySQL 迁移完成。

## 2. 迁移前必须确认

1. 是否保留 `backend/app.db` 里的历史数据。
   - 默认建议：不保留，先用 MySQL 空库验证建表、seed 和全量测试。
   - 如需保留：单独制定数据迁移计划，包含表映射、主外键顺序、重复表清理、行数校验和抽样比对。
2. 是否允许当前阶段只使用 `Base.metadata.create_all()` 建表。
   - 当前推荐：MySQL 空库验证阶段可以使用。
   - 已完成：Alembic baseline migration 已生成，生产建表以 Alembic 为准。init_db() 仅保留本地开发、SQLite 兼容和测试初始化用途；MySQL 空库验收使用 python -m alembic upgrade head。
3. 是否接受 JSON 内容继续以 `TEXT` 字段存储。
   - 当前可接受：业务测试基线不受影响。
   - 后续优化：如需要 MySQL JSON 查询能力，再单独迁移为 `JSON` 字段。

## 3. MySQL 目标库建议

```sql
CREATE DATABASE IF NOT EXISTS jiaoyu_lxfw
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

建议连接串：

```text
DATABASE_URL=mysql+pymysql://用户名:密码@127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4
```

依赖要求：

- `backend/requirements.txt` 必须包含 `pymysql`。
- 切换环境前先执行 `python -m pip install -r backend\requirements.txt`。
- 可用 `python scripts\mysql_readiness_check.py --database-url "mysql+pymysql://用户名:密码@127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4"` 先检查连接、字符集和排序规则。
- 空库建表验证可追加 `--init-tables`，该命令只用于 MySQL 空库验证，不用于迁移 SQLite 历史数据。

## 4. MySQL 兼容风险清单

| 风险 | 当前状态 | 迁移前处理建议 |
| --- | --- | --- |
| SQLite 专用连接参数 | `check_same_thread` 仅在 SQLite 下启用 | 保持现状 |
| SQLite 兼容补丁 | `backend/app/core/database.py` 中有 `_ensure_sqlite_compatible_columns()` | 确认它只服务旧 SQLite，不作为 MySQL migration |
| JSON 内容 | 多数结构化字段用 `TEXT` 保存 JSON 字符串 | 空库阶段可接受，生产化前再评估 JSON 类型 |
| 时间字段 | 使用 `DateTime` 与 `datetime.utcnow()` | 短期可用，后续统一 timezone-aware 时间 |
| 字符集 | 系统有大量中文内容 | MySQL 必须使用 `utf8mb4` |
| 历史重复表 | 现有 SQLite 中可能存在新旧表并存 | 空库验证不带入历史表；如迁数据需先清理映射 |
| migration 管理 | 当前未引入 Alembic | 生产化迁移前补正式 migration |

## 5. MySQL 空库验证流程

1. 创建数据库 `jiaoyu_lxfw`，字符集使用 `utf8mb4`。
2. 在 `backend\.env` 配置 `DATABASE_URL`。
3. 安装依赖：`python -m pip install -r backend\requirements.txt`。
4. 启动后端或运行测试，让 `init_db()` 创建表。
5. 或执行空库建表检查：
   ```powershell
   cd D:\00_Project\jiaoyu_lxfw\backend
   python scripts\mysql_readiness_check.py --database-url "mysql+pymysql://用户名:密码@127.0.0.1:3306/jiaoyu_lxfw?charset=utf8mb4" --init-tables
   ```
6. 执行 seed：`POST /api/demo/seed`。
7. 重跑后端测试：
   ```powershell
   cd D:\00_Project\jiaoyu_lxfw\backend
   python -m pytest -v
   ```
8. 重跑前端构建：
   ```powershell
   cd D:\00_Project\jiaoyu_lxfw\frontend
   npm.cmd run build
   ```
9. 复测关键链路：
   - 官网客服 Agent 咨询
   - 活动报名
   - 顾问手动录入客户线索
   - 客户画像研判和项目推荐
   - CRM 跟进、任务、阶段流转
   - 企业助手日报、组织架构、NL2SQL
   - 学生请假、反馈、心理辅助预警
   - 报告生成
   - 权限、审计、通知、系统治理

## 6. 进入 MySQL 迁移的判定

可以进入 MySQL 空库验证的条件：

- SQLite 后端测试全部通过。
- 前端构建通过。
- `pymysql` 依赖已声明并安装。
- 已确认本轮不迁移 `app.db` 历史数据，或已有独立数据迁移计划。
- 已确认 MySQL 数据库使用 `utf8mb4`。

暂缓进入 MySQL 的条件：

- SQLite 基线测试失败。
- 需要保留 `app.db` 数据但尚未做数据迁移方案。
- 业务缺口修复和数据库迁移被混在同一个改动批次中。
