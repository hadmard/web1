<?php

$target = '/data/web/zhengmu/web/index.php';
$backup = $target . '.bak-' . date('Ymd-His') . '-legacy-news-query-redirect-v3';
$portalStyleIds = array_values(array_filter(array_map('trim', file(__DIR__ . '/legacy-news-portal-style-ids.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [])));
$portalStyleIdsExport = var_export($portalStyleIds, true);

$content = file_get_contents($target);
if ($content === false) {
    fwrite(STDERR, "Failed to read {$target}\n");
    exit(1);
}

if (strpos($content, '$portalStyleIds = ' . $portalStyleIdsExport . ';') !== false) {
    fwrite(STDOUT, "Portal-style legacy news id list already present.\n");
    exit(0);
}

$needle = <<<'PHP'
    $module = $_GET['m'] ?? '';
    $controller = $_GET['c'] ?? '';
    $id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';

    if ($module !== 'news' || $controller !== 'shows' || $id === '' || !ctype_digit($id)) {
        return;
    }
PHP;

$replacement = <<<'PHP'
    $module = $_GET['m'] ?? '';
    $controller = $_GET['c'] ?? '';
    $id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
    $portalStyleIds = __PORTAL_STYLE_IDS__;

    if ($module !== 'news' || $controller !== 'shows' || $id === '' || !ctype_digit($id)) {
        return;
    }

    if (in_array($id, $portalStyleIds, true)) {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Location: https://cnzhengmu.com/news/all', true, 301);
        exit;
    }
PHP;

$replacement = str_replace('__PORTAL_STYLE_IDS__', $portalStyleIdsExport, $replacement);

if (strpos($content, $needle) === false) {
    fwrite(STDERR, "Expected legacy redirect header block not found.\n");
    exit(1);
}

if (!copy($target, $backup)) {
    fwrite(STDERR, "Failed to create backup {$backup}\n");
    exit(1);
}

$updated = str_replace($needle, $replacement, $content);
if (file_put_contents($target, $updated) === false) {
    fwrite(STDERR, "Failed to write {$target}\n");
    exit(1);
}

fwrite(STDOUT, "Upgraded {$target}\nBackup: {$backup}\n");
