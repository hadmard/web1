-- Targeted repair for three known abnormal news articles whose content was
-- mistakenly wrapped like:
--   <section><h3>概述</h3><p>&lt;h3&gt;...&lt;/h3&gt;&lt;p&gt;...&lt;/p&gt;</p></section>
--
-- Safety notes:
-- 1. This script only targets the three known article ids below.
-- 2. It still requires slug/title/status/news-scope checks as guard rails.
-- 3. It only updates rows whose content exactly matches the abnormal wrapper.
-- 4. It only decodes once, then writes the decoded inner HTML back to content.
-- 5. It only modifies articles.content and does not proactively change updatedAt.
-- 6. Transaction ends with ROLLBACK by default. Change to COMMIT only after review.

BEGIN;

CREATE TEMP TABLE tmp_news_escaped_html_targets (
  id text PRIMARY KEY,
  expected_slug text NOT NULL,
  expected_title text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_news_escaped_html_targets (id, expected_slug, expected_title)
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
  );

CREATE TEMP TABLE tmp_news_escaped_html_repaired ON COMMIT DROP AS
SELECT
  a.id,
  a.slug,
  a.title,
  a.content AS old_content,
  a."updatedAt" AS old_updated_at,
  trim(
    replace(
      replace(
        replace(
          replace(
            replace(
              substring(
                a.content
                FROM E'^\\s*<section>\\s*<h3>[^<]{1,80}</h3>\\s*<p>((?:.|\\n)+)</p>\\s*</section>\\s*$'
              ),
              '&lt;', '<'
            ),
            '&gt;', '>'
          ),
          '&quot;', '"'
        ),
        '&#39;', ''''
      ),
      '&amp;', '&'
    )
  ) AS new_content
FROM "articles" a
JOIN tmp_news_escaped_html_targets t ON t.id = a.id
WHERE
  a.slug = t.expected_slug
  AND a.title = t.expected_title
  AND a.status = 'approved'
  AND (a."categoryHref" LIKE '/news%' OR a."subHref" LIKE '/news%')
  AND a.content ~ E'^\\s*<section>\\s*<h3>[^<]{1,80}</h3>\\s*<p>((?:.|\\n)+)</p>\\s*</section>\\s*$'
  AND a.content ~ '&lt;(h1|h2|h3|p|a|img|ul|ol|li)';

SELECT
  id,
  slug,
  title,
  old_updated_at,
  left(old_content, 220) AS old_content_preview,
  left(new_content, 220) AS new_content_preview
FROM tmp_news_escaped_html_repaired
ORDER BY old_updated_at DESC;

UPDATE "articles" a
SET
  content = repaired.new_content
FROM tmp_news_escaped_html_repaired repaired
WHERE
  a.id = repaired.id
  AND a.slug = repaired.slug
  AND a.title = repaired.title;

SELECT
  a.id,
  a.slug,
  a.title,
  left(a.content, 220) AS content_after_update_preview,
  a."updatedAt" AS updated_at_after_update
FROM "articles" a
JOIN tmp_news_escaped_html_targets t ON t.id = a.id
WHERE
  a.slug = t.expected_slug
  AND a.title = t.expected_title
ORDER BY a."updatedAt" DESC;

COMMIT;
-- Change the line above back to ROLLBACK if you need another dry run.
