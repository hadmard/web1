# 关键词提取与相关阅读系统上线说明 / 回滚说明

## 1. 变更范围

本次上线交付以下功能：

- 新闻关键词自动提取
- 同义词归一与标准词输出
- 人工关键词覆盖
- 基于关键词重合度的相关阅读推荐
- 新品牌识别写入 `pending_brands`
- 自动转正阈值
- 后台待审核品牌查看与人工处理
- 操作日志与基础可观测性

## 2. 已上线规则

### 2.1 关键词提取

- 采用本地规则引擎
- 关键词来源包含：词库、标题高权重命中、规则型 NER
- 输出 3-5 个关键词
- 支持同义词归一为标准词
- 人工关键词优先级高于系统自动关键词

### 2.2 新品牌进入 pending

- 识别到疑似品牌后，先写入 `pending_brands`
- 会记录：
  - `occurrence_count`
  - `article_count`
  - `article_ids`
  - `rule_source`
  - `confidence`
  - `approved_source`
  - `auto_approved_at`

### 2.3 自动转正阈值

仅满足以下任一条件时，自动写入 `industry_whitelist`：

1. 同一篇文章中出现次数 `>= 2`
2. 不同文章累计出现篇数 `>= 2`

自动转正规则：

- `pending_brands.status = 1`
- `approved_source = auto-threshold`
- 写入 `industry_whitelist`
- 默认低权重 `weight = 1`

### 2.4 手动处理

后台支持：

- 手动批准加入词库
- 手动忽略
- 查看规则来源、置信度、文章数、出现次数、上下文

手动批准后：

- `approved_source = manual-admin`
- 后续再次命中时保留人工来源，不被自动转正覆盖

## 3. 可观测性

本次已接入 `operation_logs` 记录关键动作。

记录项包括：

- `news_pending_brand_created`
- `news_pending_brand_seen`
- `news_pending_brand_auto_approved`
- `pending_brand_manual_approved`
- `pending_brand_ignored`
- `pending_brand_updated`

后台待审核品牌页已展示汇总指标：

- 进入 pending 次数
- 自动转正次数
- 手动批准次数
- 已忽略次数
- 高频触发但未转正品牌

## 4. 验证结果

已完成验证：

- `npm run build`
- `npm run selftest:pending-brand-threshold`
- `npm run selftest:news-keywords`

边界测试已覆盖：

1. 同一篇文章出现 1 次，不转正
2. 同一篇文章出现 2 次，自动转正
3. 两篇文章各出现 1 次，第 2 篇后自动转正
4. 已手动批准品牌再次命中，不覆盖人工来源
5. `articleIds` 去重正确

## 5. 上线前检查项

上线前确认：

1. 数据库已执行最新 schema / migration
2. `industry_whitelist` 已存在初始词库
3. `pending_brands` 新字段已可读写
4. 后台管理员可访问待审核品牌页
5. 文章新增 / 编辑后会触发关键词同步
6. 新闻详情页可正常显示关键词和相关阅读

## 6. 风险说明

当前实现已可上线，但仍需关注以下运行风险：

- 规则型 NER 仍可能把机构名、项目名误判为品牌
- 自动转正阈值若过松，可能带来低质量品牌词进入词库
- 自动转正阈值若过严，可能导致优质新品牌长期停留在 pending

因此上线初期建议重点观察：

- 自动转正数量是否异常升高
- 高频 pending 是否长期堆积
- 误判品牌是否集中出现在某类上下文

## 7. 回滚说明

### 7.1 最小回滚

若上线后发现自动转正噪音偏多，但关键词主链路仍需保留：

1. 将环境变量 `NEWS_AUTO_APPROVE_PENDING_BRANDS=false`
2. 重启应用
3. 系统将继续写入 `pending_brands`
4. 系统将停止自动写入 `industry_whitelist`

这是推荐的第一层回滚方式。

### 7.2 数据回滚

若已产生错误自动入库数据：

1. 在 `industry_whitelist` 中筛选低权重自动入库词
2. 结合 `pending_brands.approved_source = auto-threshold` 排查来源
3. 删除或禁用误判词
4. 必要时将对应 `pending_brands.status` 调整回 `0` 或 `2`
5. 对受影响文章重新执行关键词同步

建议优先筛查：

- 低权重 `weight = 1`
- `approved_source = auto-threshold`
- 低 `confidence`
- `article_count` 仅刚达到阈值的品牌

### 7.3 代码级回滚

若需要整体回退本次功能：

1. 回退本次代码版本
2. 保留 `pending_brands` 数据不删除
3. 暂停自动转正
4. 视情况保留人工维护的 `industry_whitelist`

不建议直接清空词库，避免误删已人工确认的有效品牌词。

## 8. 建议的上线后观察周期

建议上线后观察 3-7 天：

- 第 1 天重点看自动转正数量
- 第 2-3 天看误判分布
- 第 4-7 天看高频 pending 是否需要调阈值或补规则

## 9. 相关文件

- [lib/news-keywords-v2.ts](/t:/2026新网站资料/web1/lib/news-keywords-v2.ts)
- [app/api/admin/pending-brands/route.ts](/t:/2026新网站资料/web1/app/api/admin/pending-brands/route.ts)
- [app/api/admin/pending-brands/[id]/route.ts](/t:/2026新网站资料/web1/app/api/admin/pending-brands/[id]/route.ts)
- [app/membership/admin/pending-brands/page.tsx](/t:/2026新网站资料/web1/app/membership/admin/pending-brands/page.tsx)
- [scripts/selftest-pending-brand-threshold.js](/t:/2026新网站资料/web1/scripts/selftest-pending-brand-threshold.js)
- [custom/reports/news-keyword-selftest-2026-04-01/report.md](/t:/2026新网站资料/web1/custom/reports/news-keyword-selftest-2026-04-01/report.md)
