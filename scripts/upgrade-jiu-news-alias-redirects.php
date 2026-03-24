<?php

$target = '/data/web/zhengmu/web/index.php';
$backup = $target . '.bak-' . date('Ymd-His') . '-news-alias-redirects';
$marker = "function redirectLegacyNewsShowRequest()";

$snippet = <<<'PHP'
function redirectLegacyNewsAliasRequest()
{
    if (PHP_SAPI === 'cli') {
        return;
    }

    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $requestPath = rtrim($requestPath, '/') ?: '/';

    $redirectMap = [
        '/news/cnews' => 'https://cnzhengmu.com/news/enterprise',
    ];

    if (!isset($redirectMap[$requestPath])) {
        return;
    }

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Location: ' . $redirectMap[$requestPath], true, 301);
    exit;
}

redirectLegacyNewsAliasRequest();

PHP;

$content = file_get_contents($target);
if ($content === false) {
    fwrite(STDERR, "Failed to read {$target}\n");
    exit(1);
}

if (strpos($content, 'function redirectLegacyNewsAliasRequest()') !== false) {
    fwrite(STDOUT, "Legacy news alias redirect already present.\n");
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
