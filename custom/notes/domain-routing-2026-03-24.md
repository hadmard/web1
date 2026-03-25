# 域名与链接现状说明

更新时间：2026-03-24

## 目标原则

按以下顺序处理站点技术调整：

1. 先保证“站不坏”
2. 再保证“搜索不掉”
3. 最后保证“AI 更容易推荐”

## 当前域名角色

- 主站：`https://cnzhengmu.com`
- 主站兼容入口：`https://www.cnzhengmu.com`
- 历史移动端域名：`https://m.cnzhengmu.com`
- 更早期移动端域名：`https://newm.cnzhengmu.com`
- 老站归档：`https://jiu.cnzhengmu.com`

## 当前线上行为

### 1. 新站主入口

- `https://cnzhengmu.com` 返回 `200`
- 这是当前唯一主域名

### 2. 兼容跳转域名

- `https://www.cnzhengmu.com` 永久跳转到 `https://cnzhengmu.com/`
- `https://m.cnzhengmu.com/` 永久跳转到 `https://cnzhengmu.com/`
- `https://newm.cnzhengmu.com/` 永久跳转到 `https://cnzhengmu.com/`

### 3. 老站

- `https://jiu.cnzhengmu.com` 返回 `200`
- 老资讯、老展会、老企业内容继续由老站承接

## 旧收录链接兜底策略

为了保证历史上已经被搜索引擎、社交平台、AI 抓取过的旧移动链接还能打开，`m` 和 `newm` 没有被简单粗暴地整站跳走，而是保留了两类旧链接直开：

- `show-*.html`
- `list-*.html`

也就是说：

- `https://m.cnzhengmu.com/show-3-117581.html` 可以正常打开
- `https://newm.cnzhengmu.com/show-8-117548.html` 可以正常打开
- `https://m.cnzhengmu.com/list-3.html` 可以正常打开
- `https://newm.cnzhengmu.com/list-19.html` 可以正常打开

但如果访问的是移动域名首页或普通路径，则统一跳转到主站：

- `https://m.cnzhengmu.com/` -> `https://cnzhengmu.com/`
- `https://newm.cnzhengmu.com/` -> `https://cnzhengmu.com/`

## 为什么这样做

### 1. 保住主站稳定

主站统一为 `cnzhengmu.com`，避免多域名并行承载内容，减少权重分散和运维复杂度。

### 2. 保住历史收录

很多老内容已经被搜索引擎和外部站点引用。直接停掉 `m/newm` 会造成大量死链，因此保留旧移动深链接直开。

### 3. 保住 AI 与搜索理解的一致性

让搜索引擎和 AI 明确：

- 新站主入口是 `cnzhengmu.com`
- 老历史内容归档入口是 `jiu.cnzhengmu.com`
- 其他旧域名只是兼容入口

## 证书现状

2026-03-24 已处理：

- `newm.cnzhengmu.com` 证书已重签
- 之前 Bing/Edge 点开 `newm` 时报 `NET::ERR_CERT_DATE_INVALID` 的问题已修复

## 已验证通过的高频样本

- `https://cnzhengmu.com`
- `https://www.cnzhengmu.com`
- `https://m.cnzhengmu.com`
- `https://newm.cnzhengmu.com`
- `https://jiu.cnzhengmu.com`
- `https://m.cnzhengmu.com/show-3-117581.html`
- `https://newm.cnzhengmu.com/show-5-117858.html`
- `https://newm.cnzhengmu.com/show-8-117548.html`
- `https://newm.cnzhengmu.com/show-20-107504.html`
- `https://m.cnzhengmu.com/list-3.html`
- `https://newm.cnzhengmu.com/list-19.html`
- `https://jiu.cnzhengmu.com/company/981746066.html`
- `https://jiu.cnzhengmu.com/companynews/10665932-171166823.html`

## 后续建议

### 第一优先级

继续保持：

- 主站不坏
- 老站不坏
- 旧移动深链接不坏

### 第二优先级

逐步清理老站页面内部残留的 `m.cnzhengmu.com` / `newm.cnzhengmu.com` 链接，减少未来继续被搜索引擎抓取到旧移动入口的概率。

### 第三优先级

后续每次改域名、Nginx、证书后，至少抽检以下入口：

- `cnzhengmu.com`
- `www.cnzhengmu.com`
- `m.cnzhengmu.com`
- `newm.cnzhengmu.com`
- `jiu.cnzhengmu.com`
- 典型 `show-*.html`
- 典型 `list-*.html`
- 老资讯页
- 老展会页
- 老企业页
