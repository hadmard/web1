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
        <p className="youxuan-entry-title">行业书籍与高端木作护理优选</p>
      </Link>
    </div>
  );
}
