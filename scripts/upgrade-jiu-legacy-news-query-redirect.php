<?php

$target = '/data/web/zhengmu/web/index.php';
$backup = $target . '.bak-' . date('Ymd-His') . '-legacy-news-query-redirect-v2';

$content = file_get_contents($target);
if ($content === false) {
    fwrite(STDERR, "Failed to read {$target}\n");
    exit(1);
}

if (strpos($content, "Location: https://cnzhengmu.com/news/all") !== false) {
    fwrite(STDOUT, "Legacy news redirect fallback already upgraded.\n");
    exit(0);
}

$old = <<<'PHP'
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
}
PHP;

$new = <<<'PHP'
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
PHP;

if (strpos($content, $old) === false) {
    fwrite(STDERR, "Expected legacy redirect block not found.\n");
    exit(1);
}

if (!copy($target, $backup)) {
    fwrite(STDERR, "Failed to create backup {$backup}\n");
    exit(1);
}

$updated = str_replace($old, $new, $content);
if (file_put_contents($target, $updated) === false) {
    fwrite(STDERR, "Failed to write {$target}\n");
    exit(1);
}

fwrite(STDOUT, "Upgraded {$target}\nBackup: {$backup}\n");
