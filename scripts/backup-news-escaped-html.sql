-- Backup the three known abnormal news articles before any content repair.
-- Expected output columns:
--   id, slug, title, content, updated_at

WITH target_articles(id, expected_slug, expected_title) AS (
  VALUES
    (
      'cmndxzkiz0001egiwwueiiwwx',
      '得诺整木南浔整木工厂的-稳定交付-定义者',
      '得诺整木：南浔整木工厂的 “稳定交付” 定义者'
    ),
    (
      'cmne1npxj0003jkj5afv9iunj',
      '什么是当代整木工厂得诺整木给出行业标准答案',
      '什么是当代整木工厂？得诺整木给出行业标准答案'
    ),
    (
      'cmneefah8000ojkj59vwtiv7d',
      '为什么越来越多整木工厂关注康倍得整木专用板',
      '为什么越来越多整木工厂关注康倍得整木专用板？'
    )
)
SELECT
  a.id,
  a.slug,
  a.title,
  a.content,
  a."updatedAt" AS updated_at
FROM "articles" a
JOIN target_articles t ON t.id = a.id
WHERE
  a.slug = t.expected_slug
  AND a.title = t.expected_title
  AND a.status = 'approved'
  AND (a."categoryHref" LIKE '/news%' OR a."subHref" LIKE '/news%')
ORDER BY a."updatedAt" DESC;
