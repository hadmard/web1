/**
 * 文件说明：该文件维护可公开提交到仓库的站点基础信息。
 * 功能说明：提供正式域名、公开联系方式等运行时常量，避免前台依赖未提交的环境变量。
 *
 * 结构概览：
 *   第一部分：站点基础常量
 *   第二部分：公开联系方式常量
 */

// ========== 第一部分：站点基础常量 ==========

export const PUBLIC_SITE_URL = "https://cnzhengmu.com";
export const PUBLIC_MEMBER_CONTACT_EMAIL = "yfcccc@zju.edu.cn";
export const PUBLIC_BUSINESS_CONTACT_EMAIL = "yfcccc@zju.edu.cn";
export const PUBLIC_CONTACT_PHONE = "13386531653";

// ========== 第二部分：公开联系方式常量 ==========

export const PUBLIC_CONTACT_ITEMS = [
  `会员咨询：${PUBLIC_MEMBER_CONTACT_EMAIL}`,
  `商务合作：${PUBLIC_BUSINESS_CONTACT_EMAIL}`,
  `联系电话：${PUBLIC_CONTACT_PHONE}`,
  "工作时间：周一至周五 09:00-18:00",
];
