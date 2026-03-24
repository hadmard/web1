<?php

$target = '/data/web/zhengmu/web/index.php';
$backup = $target . '.bak-' . date('Ymd-His') . '-legacy-news-query-redirect';
$marker = "require(APP_PATH . 'vendor/autoload.php');";
$portalStyleIds = array_values(array_filter(array_map('trim', file(__DIR__ . '/legacy-news-portal-style-ids.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [])));
$portalStyleIdsExport = var_export($portalStyleIds, true);

$snippet = <<<'PHP'
function redirectLegacyNewsShowRequest()
{
    if (PHP_SAPI === 'cli') {
        return;
    }

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

    $newsRoot = __DIR__ . '/news';
    $patterns = [
        $newsRoot . '/' . $id . '.html',
        $newsRoot . '/*/' . $id . '.html',
        $newsRoot . '/*/*/' . $id . '.html',
    ];

    foreach ($patterns as $pattern) {
        $matches = glob($pattern, GLOB_NOSORT);
        if (!empty($matches)) {
            sort($matches, SORT_STRING);
            $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', substr($matches[0], strlen(__DIR__)));
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Location: https://jiu.cnzhengmu.com' . $relativePath, true, 301);
            exit;
        }
    }

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Location: https://cnzhengmu.com/news/all', true, 301);
    exit;
}

redirectLegacyNewsShowRequest();

PHP;

$snippet = str_replace('__PORTAL_STYLE_IDS__', $portalStyleIdsExport, $snippet);

$content = file_get_contents($target);
if ($content === false) {
    fwrite(STDERR, "Failed to read {$target}\n");
    exit(1);
}

if (strpos($content, 'function redirectLegacyNewsShowRequest()') !== false) {
    fwrite(STDOUT, "Legacy news redirect already present.\n");
    exit(0);
}

if (strpos($content, $marker) === false) {
    fwrite(STDERR, "Marker not found in {$target}\n");
    exit(1);
}

if (!copy($target, $backup)) {
    fwrite(STDERR, "Failed to create backup {$backup}\n");
    exit(1);
}

$updated = str_replace($marker, $snippet . $marker, $content);
if (file_put_contents($target, $updated) === false) {
    fwrite(STDERR, "Failed to write {$target}\n");
    exit(1);
}

fwrite(STDOUT, "Updated {$target}\nBackup: {$backup}\n");
