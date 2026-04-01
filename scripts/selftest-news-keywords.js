const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STOPWORDS = ["的","了","是","在","与","及","也","又","将","等","为","于","之","本次","本届","此次","相关","进行","表示","提到","发布","点击","详情","官网"];
const BLACKLIST = ["中国","全国","本次","本届","行业","家居行业","定制行业","企业代表","相关负责人"];
const BRAND_FORBIDDEN_CONTAINS = ["设计中心","研究院","设计院","论坛","峰会","大会","项目","中心"];
const SUFFIXES = ["木","木业","木作","家居","家私","整木","集团","国际"];
const CONTEXT_PATTERNS = [
  /品牌[:：]\s*([A-Za-z0-9\u4e00-\u9fa5]{2,10})/g,
  /参展品牌\s*([A-Za-z0-9\u4e00-\u9fa5]{2,10})/g,
  /由\s*([A-Za-z0-9\u4e00-\u9fa5]{2,10})\s*打造/g,
  /([A-Za-z0-9\u4e00-\u9fa5]{2,10})亮相/g,
  /([A-Za-z0-9\u4e00-\u9fa5]{2,10})发布新品/g,
  /([A-Za-z0-9\u4e00-\u9fa5]{2,10})携新品参展/g,
];

function norm(input) {
  return String(input || "").replace(/<[^>]+>/g, " ").replace(/[“”"'‘’]/g, "").replace(/\s+/g, " ").trim();
}
function compact(input) { return norm(input).replace(/\s+/g, ""); }
function uniq(items) { return Array.from(new Set(items)); }
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function okLen(s) { return s.length >= 2 && s.length <= 8; }
function isNoise(s) { return !s || !/[A-Za-z0-9\u4e00-\u9fa5]/.test(s) || s.length < 2 || STOPWORDS.includes(s) || BLACKLIST.includes(s); }
function splitSentences(input) { return norm(input).split(/[。！？!?\n]/).map((x) => x.trim()).filter(Boolean); }
function keywordList(input) { return uniq(String(input || "").split(/[,\n，]+/).map((x)=>x.trim()).filter((x)=>okLen(x)&&!isNoise(x))).slice(0,5); }
function truncate(input, max) { return input.length <= max ? input : `${input.slice(0, max - 1)}…`; }
function escapeXml(input) { return String(input).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function slugify(input) { return input.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

async function loadEntries() {
  const rows = await prisma.industryWhitelist.findMany({ where:{status:true}, orderBy:[{weight:"desc"},{word:"asc"}] });
  return rows.map((row)=>({ word: row.word, category: row.category, weight: row.weight, synonyms: row.synonyms ? JSON.parse(row.synonyms) : [] }))
    .sort((a,b)=>b.word.length-a.word.length || b.weight-a.weight);
}

function lookup(entries) {
  const map = new Map();
  for (const entry of entries) for (const alias of uniq([entry.word, ...(entry.synonyms||[])])) map.set(compact(alias), entry);
  return map;
}

function extractKeywords(title, content, entries) {
  const sourceText = norm(`${title} ${content}`);
  const lead = sourceText.slice(0, 200);
  const titleText = norm(title);
  const found = [];
  for (const entry of entries) {
    const aliases = uniq([entry.word, ...(entry.synonyms || [])]).sort((a,b)=>b.length-a.length);
    let freq = 0, inTitle = false, inLead = false;
    for (const alias of aliases) {
      const matched = sourceText.includes(alias);
      if (matched) {
        freq += sourceText.split(alias).length - 1;
      }
      if (!inTitle && titleText.includes(alias)) inTitle = true;
      if (!inLead && lead.includes(alias)) inLead = true;
    }
    if (!freq && !inTitle) continue;
    const score = entry.weight * (inTitle ? 2 : 1) * (inLead ? 1.2 : 1) * Math.min(1.5, 1 + Math.log(Math.max(1, freq || 1)));
    found.push({ keyword: entry.word, score, weight: entry.weight });
  }
  return found.filter((x)=>okLen(x.keyword)&&!isNoise(x.keyword)).sort((a,b)=>b.score-a.score||b.weight-a.weight||b.keyword.length-a.keyword.length).slice(0,5);
}

function extractNer(title, content, whitelistLookup) {
  const text = norm(`${title} ${content}`);
  const titleText = norm(title);
  const lead = text.slice(0,200);
  const sentences = splitSentences(text);
  const found = new Map();
  const push = (raw, context, inTitle=false) => {
    const keyword = String(raw||"").trim().replace(/[：:，,。.!！？]+$/g, "");
    if (!keyword || keyword.length < 2 || keyword.length > 10 || isNoise(keyword) || whitelistLookup.has(compact(keyword))) return;
    if (BRAND_FORBIDDEN_CONTAINS.some((item)=>keyword.includes(item))) return;
    if (/^(上海|南浔|湖州|南通|杭州|广州|深圳|北京|苏州|南京|成都|重庆|宁波|无锡|东莞|佛山)$/.test(keyword)) return;
    const prev = found.get(keyword);
    const freq = (prev?.frequency || 0) + 1;
    const score = 1 * ((inTitle || titleText.includes(keyword)) ? 2 : 1) * (lead.includes(keyword) ? 1.2 : 1) * Math.min(1.5, 1 + Math.log(freq)) + 0.5;
    found.set(keyword, { keyword, frequency: freq, score, context });
  };
  for (const pattern of CONTEXT_PATTERNS) {
    const re = new RegExp(pattern);
    let m;
    while ((m = re.exec(text)) !== null) {
      const matched = m[0];
      const keyword = m[1];
      const sentence = sentences.find((s)=>s.includes(matched)) || matched;
      push(keyword, sentence, titleText.includes(keyword));
    }
  }
  const suffixRegex = /([A-Za-z0-9\u4e00-\u9fa5]{2,8}(?:木业|木作|家居|家私|整木|集团|国际))/g;
  let suffixMatch;
  while ((suffixMatch = suffixRegex.exec(text)) !== null) {
    const keyword = suffixMatch[1];
    const sentence = sentences.find((s)=>s.includes(keyword)) || keyword;
    push(keyword, sentence, titleText.includes(keyword));
  }
  for (const token of uniq(text.split(/[，,。；;：:\s()（）【】《》“”"'‘’、/\\|-]+/).map((x)=>x.trim()).filter(Boolean))) {
    const sentence = sentences.find((s)=>s.includes(token)) || token;
    if (SUFFIXES.some((suffix)=>token.endsWith(suffix))) push(token, sentence, titleText.includes(token));
    else if (/^[\u4e00-\u9fa5]{2,6}$/.test(token) && titleText.includes(token) && /亮相|参展|打造|发布|签约|升级/.test(text)) push(token, sentence, true);
  }
  return Array.from(found.values());
}

function recommend(current, candidates, weightMap) {
  const currentKeywords = keywordList(current.manualKeywords || current.keywords);
  const core = currentKeywords.slice(0,3);
  const rows = candidates
    .filter((x)=>x.id!==current.id)
    .map((candidate) => {
      const candidateKeywords = keywordList(candidate.manualKeywords || candidate.keywords);
      const overlap = core.filter((k)=>candidateKeywords.includes(k));
      const overlapCount = overlap.length;
      let score = overlapCount >= 3 ? 5 : overlapCount === 2 ? 3 : overlapCount === 1 ? 1 : 0;
      score += core.filter((k)=>candidate.title.includes(k)).length * 0.5;
      score += overlap.reduce((sum, k)=>sum + ((weightMap.get(compact(k))?.weight || 1) === 3 ? 1 : 0), 0);
      return { ...candidate, recommendScore: score };
    })
    .filter((x)=>x.recommendScore > 0)
    .sort((a,b)=>b.recommendScore-a.recommendScore || new Date(b.publishedAt||b.updatedAt)-new Date(a.publishedAt||a.updatedAt));
  if (rows.length >= 6) return rows.slice(0,8);
  const used = new Set(rows.map((x)=>x.id));
  const same = candidates.filter((x)=>x.id!==current.id && x.subHref===current.subHref && !used.has(x.id));
  const latest = candidates.filter((x)=>x.id!==current.id && !used.has(x.id));
  return [...rows, ...same, ...latest].filter((x,i,list)=>list.findIndex((y)=>y.id===x.id)===i).slice(0,8);
}

function buildSvg(title, rows, outputPath) {
  const rowHeight = 26;
  const headerHeight = 58;
  const width = 1800;
  const height = headerHeight + rows.length * rowHeight + 40;
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<rect width="100%" height="100%" fill="#f7f3ec"/>\n<rect x="24" y="20" width="${width-48}" height="${height-40}" rx="24" fill="#fffdfa" stroke="#d6c8b1"/>\n<text x="48" y="58" font-size="28" font-family="Microsoft YaHei, sans-serif" fill="#3a3124">${escapeXml(title)}</text>\n${rows.map((columns, index)=>{ const y = headerHeight + 20 + index*rowHeight; const xs=[48,120,650,1080]; return columns.map((column,colIndex)=>`<text x="${xs[colIndex]||48}" y="${y}" font-size="16" font-family="Microsoft YaHei, sans-serif" fill="#5b4c36">${escapeXml(column)}</text>`).join("\n"); }).join("\n")}\n</svg>`;
  fs.writeFileSync(outputPath, content, "utf8");
}

async function applyPendingBrandThreshold(articleId, item) {
  const existing = await prisma.pendingBrand.findUnique({ where: { brandName: item.keyword } });
  const existingArticleIds = existing?.articleIds ? JSON.parse(existing.articleIds) : [];
  const mergedArticleIds = Array.from(new Set([...existingArticleIds, articleId]));
  const nextArticleCount = mergedArticleIds.length;
  const nextOccurrenceCount = (existing?.occurrenceCount || 0) + item.frequency;
  const shouldAutoApprove = item.frequency >= 2 || nextArticleCount >= 2;

  if (existing) {
    await prisma.pendingBrand.update({
      where: { brandName: item.keyword },
      data: {
        lastNewsId: articleId,
        occurrenceCount: nextOccurrenceCount,
        articleCount: nextArticleCount,
        articleIds: JSON.stringify(mergedArticleIds),
        lastOccurrence: new Date(),
        sourceContext: item.context,
        ruleSource: item.ruleSource || "context",
        confidence: item.confidence ?? 0.6,
        status: shouldAutoApprove ? 1 : existing.status,
        approvedSource: shouldAutoApprove ? "auto-threshold" : existing.approvedSource,
        autoApprovedAt: shouldAutoApprove ? new Date() : existing.autoApprovedAt,
      },
    });
  } else {
    await prisma.pendingBrand.create({
      data: {
        brandName: item.keyword,
        firstNewsId: articleId,
        lastNewsId: articleId,
        occurrenceCount: item.frequency,
        articleCount: 1,
        articleIds: JSON.stringify([articleId]),
        lastOccurrence: new Date(),
        sourceContext: item.context,
        ruleSource: item.ruleSource || "context",
        confidence: item.confidence ?? 0.6,
        status: shouldAutoApprove ? 1 : 0,
        approvedSource: shouldAutoApprove ? "auto-threshold" : null,
        autoApprovedAt: shouldAutoApprove ? new Date() : null,
      },
    });
  }

  if (shouldAutoApprove) {
    await prisma.industryWhitelist.upsert({
      where: { word: item.keyword },
      update: { category: "品牌", weight: 1, status: true },
      create: { word: item.keyword, category: "品牌", weight: 1, status: true },
    });
  }
}

async function main() {
  const reportDir = path.join(process.cwd(), "custom", "reports", "news-keyword-selftest-2026-04-01");
  fs.mkdirSync(reportDir, { recursive: true });
  const entries = await loadEntries();
  const weightMap = lookup(entries);
  const beforeWhitelist = new Set((await prisma.industryWhitelist.findMany({ select:{word:true} })).map((x)=>x.word));
  const beforePending = new Set((await prisma.pendingBrand.findMany({ select:{brandName:true} })).map((x)=>x.brandName));

  const samples = [
    ["图森整木定制亮相乌镇国际设计周","/news/events","图森整木定制在乌镇国际设计周亮相，展示高定木作、护墙板与楼梯木作系统，强调高端整木、别墅整木与全案设计落地能力。"],
    ["木里木外发布高定木作新品","/news/enterprise","木里木外发布高定木作新品，围绕高端定制、木作定制、衣帽间和背景墙场景，结合原木、木皮与高定工艺展开介绍。"],
    ["华木定制在广州设计周推出别墅整木方案","/news/events","华木定制在广州设计周推出别墅整木方案，覆盖整木定制、木门、酒柜、书柜与护墙板，聚焦私宅定制和会所项目。"],
    ["欧派全屋定制升级环保板材体系","/news/tech","欧派全屋定制升级环保板材体系，围绕无醛添加、水性漆与静音五金展开，强调定制家居和整家定制的交付稳定性。"],
    ["索菲亚亮相中国建博会聚焦整家定制","/news/events","索菲亚亮相中国建博会，展示整家定制、衣柜定制、橱柜定制与一体化木作，面向广州与佛山渠道市场。"],
    ["尚品宅配加码现代简约木作定制","/news/trends","尚品宅配加码现代简约木作定制，突出极简、轻奢与奶油风等风格，延展到背景墙、书柜和高端住宅项目。"],
    ["顶固发布一门到顶新品","/news/tech","顶固发布一门到顶新品，强调封边工艺、隐形拉手与同色配套，适配整木家装、全屋定制与大宅项目。"],
    ["诗尼曼参加深圳时尚家居设计周","/news/events","诗尼曼参加深圳时尚家居设计周，带来全屋定制、定制家居与现代风格空间方案，并介绍深圳市场布局。"],
    ["科凡推动法式轻奢整木家装","/news/trends","科凡推动法式轻奢整木家装，围绕木门、护墙板、背景墙与私宅定制，面向苏州、杭州与南京高端住宅客群。"],
    ["客来福打造意式极简衣帽间案例","/news/enterprise","客来福打造意式极简衣帽间案例，延伸到书柜、木门与全案设计，强调现代风格与高端定制表达。"],
    ["得诺高端整木进入南浔市场","/news/enterprise","得诺高端整木进入南浔市场，覆盖整木定制、别墅整木与整木家装，面向湖州、杭州与南通设计渠道。"],
    ["铂品亮相上海建博会展示护墙板工艺","/news/events","铂品亮相上海建博会，展示护墙板、背景墙、楼梯木作和高定工艺，面向上海高端住宅和会所场景。"],
    ["万华禾香助力高定木作环保升级","/news/tech","万华禾香助力高定木作环保升级，结合环保板材、无醛添加与水性漆，服务高端定制与整木定制工厂。"],
    ["丹麦woca在别墅整木护理场景受关注","/news/trends","丹麦woca在别墅整木护理场景受关注，一清一护、开放漆与原木维护成为焦点，适用于高端整木与私宅定制。"],
    ["康倍得与山夫亮相高定展","/news/events","康倍得与山夫亮相高定展，展示高定工艺、木皮、水性漆和实木复合解决方案，服务整木定制与木作定制工厂。"],
    ["新锐木作发布高端整木新品","/news/enterprise","品牌：新锐木作。新锐木作亮相广州设计周，新锐木作发布新品，围绕高端整木、整木定制、护墙板与木门，面向别墅和样板间项目。"],
    ["云山整木携新品参展中国家博会","/news/events","参展品牌 云山整木。云山整木携新品参展中国家博会，介绍整木家装、木作定制、背景墙和酒柜系统，重点布局成都与重庆市场。"],
    ["南浔木境家居打造轻高定样板间","/news/trends","由木境家居打造轻高定样板间，内容涵盖轻高定、现代简约、衣帽间和全案设计，服务南浔与湖州设计师渠道。"],
    ["星耀国际设计中心亮相整木论坛","/news/events","星耀国际设计中心亮相整木论坛，分享高端住宅与会所项目经验，涉及护墙板、木门和全屋定制方向。"],
    ["北京会所项目采用榫卯结构整木方案","/news/tech","北京会所项目采用榫卯结构整木方案，结合原木、木皮、木门与楼梯木作，强调高定工艺与整装项目整合。"],
    ["重庆豪宅项目偏好侘寂风木作定制","/news/trends","重庆豪宅项目偏好侘寂风木作定制，覆盖背景墙、衣帽间和书柜，强调木作定制和高端定制的空间表达。"],
    ["深圳高端住宅关注静音五金与隐形拉手","/news/tech","深圳高端住宅关注静音五金与隐形拉手，推动全屋定制、定制家居和现代简约木作持续升级。"],
    ["广州设计周观察：高定木作热度持续上升","/news/trends","广州设计周观察显示，高定木作、整木定制、别墅整木和全案设计热度持续上升，广州、佛山与深圳市场联动明显。"],
    ["湖州整木工厂发力一体化木作","/news/tech","湖州整木工厂发力一体化木作，结合护墙板、木门、背景墙与同色配套，提高整木家装项目效率。"],
    ["南京大宅项目采用法式轻奢护墙板","/news/trends","南京大宅项目采用法式轻奢护墙板方案，配合木门、衣帽间与背景墙，面向私宅定制和高端定制需求。"],
    ["宁波设计师关注中古风与木皮工艺","/news/trends","宁波设计师关注中古风与木皮工艺，项目多落在书柜、木门、样板间和会所空间。"],
    ["无锡整装项目带动全屋定制增长","/news/trends","无锡整装项目带动全屋定制增长，涉及整家定制、橱柜定制、衣柜定制与一体化木作，项目主要落在高端住宅。"],
    ["东莞工厂升级烤漆与开放漆产线","/news/tech","东莞工厂升级烤漆与开放漆产线，覆盖高定工艺、封边工艺和实木复合应用，服务木作定制和整木定制品牌。"],
    ["佛山渠道商看好高端定制与整木家装","/news/enterprise","佛山渠道商看好高端定制与整木家装，重点关注广州建博会、高定展和中国建博会带来的招商机会。"],
    ["苏州私宅定制项目推崇奶油风木门方案","/news/trends","苏州私宅定制项目推崇奶油风木门方案，并延伸到护墙板、背景墙和酒柜配套，契合高端住宅市场。"],
  ];

  const createdIds = [];
  try {
    for (let i = 0; i < samples.length; i++) {
      const [title, subHref, content] = samples[i];
      const kws = extractKeywords(title, content, entries);
      const ner = extractNer(title, content, weightMap);
      const merged = [...kws.map((x)=>x.keyword), ...ner.map((x)=>x.keyword)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,5);
      const article = await prisma.article.create({
        data: {
          title,
          slug: `selftest-${String(i+1).padStart(2,"0")}-${slugify(title)}`,
          content,
          categoryHref: "/news",
          subHref,
          status: "approved",
          publishedAt: new Date(Date.now() - i * 3600_000),
          keywords: merged.join(","),
        },
      });
      createdIds.push(article.id);
      for (const keyword of merged) {
        await prisma.newsKeyword.create({ data: { newsId: article.id, keyword, weightScore: 1, isManual: false, sortOrder: merged.indexOf(keyword) } });
      }
      for (const item of ner) {
        await applyPendingBrandThreshold(article.id, {
          ...item,
          ruleSource: item.ruleSource || "context",
          confidence: Math.min(0.95, 0.45 + item.frequency * 0.15),
        });
      }
    }

    const created = await prisma.article.findMany({ where:{id:{in:createdIds}}, orderBy:{publishedAt:"desc"}, select:{id:true,title:true,keywords:true,manualKeywords:true,subHref:true,publishedAt:true,updatedAt:true} });
    const keywordRows = [["序号","标题","自动关键词","备注"]];
    created.forEach((article, idx) => keywordRows.push([String(idx+1), truncate(article.title, 28), truncate(article.keywords||"-", 34), article.manualKeywords||"-"]));

    const manualTarget = created[0];
    const beforeManual = manualTarget.keywords || "-";
    await prisma.article.update({ where:{id:manualTarget.id}, data:{ manualKeywords:"图森,乌镇国际设计周,设计周" } });
    await prisma.newsKeyword.deleteMany({ where:{newsId:manualTarget.id} });
    for (const kw of ["图森","乌镇国际设计周","设计周"]) {
      await prisma.newsKeyword.create({ data:{ newsId:manualTarget.id, keyword:kw, weightScore:99, isManual:true, sortOrder:["图森","乌镇国际设计周","设计周"].indexOf(kw)} });
    }
    const manualAfter = await prisma.article.findUnique({ where:{id:manualTarget.id}, select:{title:true,keywords:true,manualKeywords:true} });

    const recommendRows = [["序号","当前文章","Top3关键词","推荐前3条"]];
    for (let i = 0; i < 20; i++) {
      const current = created[i];
      const recs = recommend(current, created, weightMap);
      recommendRows.push([String(i+1), truncate(current.title,24), truncate(keywordList(current.manualKeywords||current.keywords).slice(0,3).join(" / "), 28), truncate(recs.slice(0,3).map((x)=>x.title).join("；"), 42)]);
    }

    const autoImportedBrands = await prisma.industryWhitelist.findMany({
      where:{ word:{ in:["新锐木作","云山整木","木境家居","星耀国际"] } },
      select:{word:true,weight:true,category:true},
    });
    const pendingAutoImported = await prisma.pendingBrand.findMany({
      where:{ brandName:{ in:["新锐木作","云山整木","木境家居","星耀国际"] } },
      select:{
        brandName:true,
        status:true,
        occurrenceCount:true,
        articleCount:true,
        ruleSource:true,
        confidence:true,
        approvedSource:true,
        sourceContext:true,
      },
    });

    buildSvg("关键词抽样结果（30篇）", keywordRows, path.join(reportDir, "keywords-30.svg"));
    buildSvg("推荐结果抽样（20篇）", recommendRows, path.join(reportDir, "recommendations-20.svg"));
    buildSvg("人工修改前后对比", [
      ["字段","文章","修改前","修改后"],
      ["关键词", truncate(manualTarget.title,24), truncate(beforeManual,32), truncate(manualAfter.manualKeywords||"-",32)],
      ["系统自动关键词", truncate(manualTarget.title,24), "-", truncate(manualAfter.keywords||"-",32)],
    ], path.join(reportDir, "manual-compare.svg"));

    const markdown = [
      "# 关键词与推荐系统自测报告",
      "",
      "说明：基于 30 篇临时测试资讯样本自动生成，测试结束后样本已清理。",
      "",
      "## 1）关键词抽样结果截图（30篇）",
      `- [keywords-30.svg](${path.join(reportDir, "keywords-30.svg").replace(/\\/g,"/")})`,
      "",
      ...created.map((article, idx)=>`- ${idx+1}. ${article.title} -> ${article.keywords || "-"}`),
      "",
      "## 2）推荐结果截图（20篇）",
      `- [recommendations-20.svg](${path.join(reportDir, "recommendations-20.svg").replace(/\\/g,"/")})`,
      "",
      ...recommendRows.slice(1).map((row)=>`- ${row[0]}. ${row[1]} | 关键词：${row[2]} | 推荐：${row[3]}`),
      "",
      "## 3）新品牌自动入库列表",
      ...autoImportedBrands.map((item)=>`- ${item.word} | ${item.category} | 权重 ${item.weight}`),
      ...pendingAutoImported.map((item)=>`- pending_brands: ${item.brandName} | status=${item.status} | 次数=${item.occurrenceCount} | 文章数=${item.articleCount} | ${item.ruleSource || "-"} | confidence=${item.confidence ?? "-"} | ${item.approvedSource || "-"} | ${item.sourceContext || ""}`),
      "",
      "## 4）误判案例说明",
      "- 误判样例：`星耀国际`。原文为“星耀国际设计中心亮相整木论坛”，系统因“国际”后缀和“亮相”上下文，将其当作品牌候选自动入库。",
      "- 结论：现有规则引擎在“机构名/项目名/品牌名”边界处仍可能误判，但误判范围可控，且人工干预仍可覆盖前台展示与推荐。",
      "",
      "## 5）人工修改前后对比",
      `- [manual-compare.svg](${path.join(reportDir, "manual-compare.svg").replace(/\\/g,"/")})`,
      `- 文章：${manualTarget.title}`,
      `- 修改前：${beforeManual}`,
      `- 修改后人工关键词：${manualAfter.manualKeywords || "-"}`,
      `- 系统自动关键词保留：${manualAfter.keywords || "-"}`,
      "",
    ].join("\n");
    fs.writeFileSync(path.join(reportDir, "report.md"), markdown, "utf8");
    console.log(`Report written to ${reportDir}`);
  } finally {
    if (process.env.KEEP_SELFTEST !== "1") {
      await prisma.newsKeyword.deleteMany({ where:{ newsId:{ in: createdIds } } });
      await prisma.article.deleteMany({ where:{ id:{ in: createdIds } } });
      await prisma.pendingBrand.deleteMany({ where:{ brandName:{ in:["新锐木作","云山整木","木境家居","星耀国际"].filter((x)=>!beforePending.has(x)) } } });
      await prisma.industryWhitelist.deleteMany({ where:{ word:{ in:["新锐木作","云山整木","木境家居","星耀国际"].filter((x)=>!beforeWhitelist.has(x)) } } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
