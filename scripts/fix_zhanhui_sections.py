from pathlib import Path
import re


FILES = [
    Path("/data/web/zhengmu/web/zhanhui/yugao/index.html"),
    Path("/data/web/zhengmu/web/zhanhui/zhuangfang/index.html"),
    Path("/data/web/zhengmu/web/zhanhui/xinwen/index.html"),
    Path("/data/web/zhengmu/web/zhanhui/changshi/index.html"),
]

OLD_CSS = (
    '<style id="codex-section-header-fixes">.tool,.i-tool{display:none !important;}'
    '.new-header{top:0 !important;margin-top:0 !important;}.header-nav-box{display:grid;'
    'grid-template-columns:240px minmax(0,1fr) 160px;align-items:center;column-gap:28px;'
    'height:70px;width:1200px;margin:0 auto;}.zmw-logo-box{float:none;width:240px;'
    'min-width:240px;display:flex;align-items:center;}.zmw-logo-box a{display:flex;'
    'align-items:center;}.header-logo{margin-top:0;display:block;width:220px;}.ymPublic_nav'
    '{float:none;margin:0;min-width:0;display:flex;align-items:center;overflow:hidden;}'
    '.nav-content-list{display:flex;align-items:center;justify-content:flex-start;gap:22px;'
    'list-style:none;margin:0;padding:0;flex-wrap:nowrap;width:100%;}.nav-content-list>li.'
    'ymPublic_navLi{float:none;padding:0;display:flex;align-items:center;position:relative;'
    'height:auto;flex:0 0 auto;}.nav-content-list>li.ymPublic_navLi:before,.nav-content-list>li.'
    'zm-ziti{content:none !important;display:none !important;}.nav-content-list>li.ymPublic_navLi>a'
    '{white-space:nowrap;display:block;}.new-index-so{float:none;width:160px;height:auto;'
    'display:flex;justify-content:flex-end;}</style></head>'
)

NEW_CSS = (
    '<style id="codex-section-header-fixes">.tool,.i-tool{display:none !important;}'
    '.new-header{top:0 !important;margin-top:0 !important;}.header-nav-box{display:grid;'
    'grid-template-columns:240px minmax(0,1fr) 150px;align-items:center;column-gap:18px;'
    'height:70px;width:1200px;margin:0 auto;}.zmw-logo-box{float:none;width:240px;'
    'min-width:240px;display:flex;align-items:center;}.zmw-logo-box a{display:flex;'
    'align-items:center;}.header-logo{margin-top:0;display:block;width:220px;}.ymPublic_nav'
    '{float:none;margin:0;min-width:0;display:flex;align-items:center;overflow:hidden;'
    'padding-left:0 !important;}.nav-content-list{display:flex;align-items:center;'
    'justify-content:flex-start;gap:16px;list-style:none;margin:0;padding:0;flex-wrap:nowrap;'
    'width:100%;}.nav-content-list>li.ymPublic_navLi{float:none;padding:0;display:flex;'
    'align-items:center;position:relative;height:auto;flex:0 0 auto;}.nav-content-list>li.'
    'ymPublic_navLi:before,.nav-content-list>li.zm-ziti,.icon-new{content:none !important;'
    'display:none !important;}.nav-content-list>li.ymPublic_navLi>a{white-space:nowrap;'
    'display:block;}.new-index-so{float:none;width:150px;height:auto;display:flex;'
    'justify-content:flex-end;}.vip_set{line-height:1.2;}</style></head>'
)

SECTION_FIX = (
    '<style id="codex-zhanhui-section-fixes">.exh-header{display:flex !important;'
    'align-items:flex-start !important;gap:24px !important;}.exh-nav{float:none !important;'
    'flex:0 0 250px !important;width:250px !important;}.exh-rot{display:none !important;}'
    '.exh-recom{float:none !important;flex:1 1 auto !important;width:auto !important;}'
    '</style>'
)


for path in FILES:
    text = path.read_text(encoding="utf-8")
    text = text.replace(OLD_CSS, NEW_CSS)
    text = re.sub(
        r'\s*<li class="ymPublic_navLi navBar_liA"><a href="/specials" class="ymPublic_navLiA ">专题</a></li>\s*',
        "\n",
        text,
        count=1,
    )
    if SECTION_FIX not in text:
        text = re.sub(
            r'(<link rel="stylesheet" href="/static/css/new-zhanhui\.css\?v=[^"]+"/>)',
            r"\1\n" + SECTION_FIX,
            text,
            count=1,
        )
    text = text.replace(
        "https://www.cnzhengmu.com/zhanhui/",
        "https://jiu.cnzhengmu.com/zhanhui/",
    )
    path.write_text(text, encoding="utf-8")
    print(f"patched {path}")
