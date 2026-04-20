import Link from "next/link";
import { YOUXUAN_H5_URL, YOUXUAN_NAME } from "@/lib/youxuan";

export function YouxuanEntryStrip() {
  return (
    <div className="youxuan-entry-shell mt-2.5 sm:mt-4">
      <Link
        href={YOUXUAN_H5_URL}
        target="_blank"
        rel="noreferrer"
        className="youxuan-entry-copy youxuan-entry-copy--link"
        aria-label="进入整木优选商城"
      >
        <p className="youxuan-entry-kicker">{YOUXUAN_NAME}</p>
        <p className="youxuan-entry-title">行业书籍与木作护理入口可见，但不打断首页内容浏览。</p>
      </Link>
    </div>
  );
}
