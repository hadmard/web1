# Company Migration Field Mapping

Date: 2026-03-24

## Migration Principle

Legacy `/company` data is not a standalone ranking list.

It must be reconstructed as:

- `Member` = account and membership identity
- `Enterprise` = enterprise master profile
- `Brand` = front-end brand display layer
- `Award` = award / ranking / recommendation identity

Relationship:

- `Member` -> binds `Enterprise`
- `Enterprise` -> may be exposed in `Brand`
- `Enterprise` -> may be attached to `Award`

## Current Reality In Code

Confirmed from current codebase:

- Legacy company import scripts already map old company rows into `Member + Enterprise`
- `is_vip` already affects:
  - `memberType`
  - `rankingWeight`
  - `member_site_settings.template`
- Current `/enterprise/[id]` page is enterprise-driven
- Current `/brands` and `/brands/all` are still article-driven, not enterprise-driven
- Current `Brand` model is too thin and is not yet linked to `Enterprise`
- Current `Award` model is standalone and is not yet linked to `Enterprise`

So the requested target structure is directionally aligned with the project, but not fully implemented yet.

## Field Mapping

### Account Layer -> Member

| Legacy field | New target | Destination field | Notes |
| --- | --- | --- | --- |
| `user_id` | Member binding source | external mapping key / import report | Used for member binding traceability; should be preserved in import report or mapping table |
| `username` | Member | `email` fallback input / account seed | Current script uses it as one candidate when generating account identifier |
| `user_email` | Member | `email` preferred input | Best source when valid |
| `user_mobile` | Member | account fallback / future phone-login candidate | Currently used as fallback account candidate |
| `user_password_hash` | Member | `passwordHash` | Legacy `$2y$` hash normalized and imported |
| `user_name` | Member | `name` fallback | Used when nickname is absent |
| `user_nickname` | Member | `name` preferred display name | Preferred member display name |
| `is_vip` | Member | `memberType` | `1 -> enterprise_advanced`, else `enterprise_basic` |
| `is_vip` | Member | `rankingWeight` | Current import uses higher weight for VIP |

### Enterprise Master Profile -> Enterprise

| Legacy field | New target | Destination field | Notes |
| --- | --- | --- | --- |
| `name` | Enterprise | `companyName` | Full legal / public company name |
| `short_name` | Enterprise | `companyShortName` | Preferred front-end display name |
| `content` | Enterprise | `intro` | Enterprise intro main source |
| `logo` | Enterprise | `logoUrl` | Must normalize to absolute URL and check broken images |
| `website` | Enterprise | `website` | Public official website |
| `address` | Enterprise | `address` | Enterprise address |
| `phone` | Enterprise | `contactPhone` | Public contact phone |
| `contact` | Enterprise | `contactPerson` | Contact person |
| `email` | Enterprise | `contactInfo` partial | Stored in combined contact info |
| `fax` | Enterprise | `contactInfo` partial | Stored in combined contact info |
| `wechat_qrcode` | Enterprise | `contactInfo` partial / future media asset | Current script stores URL into contact info text |
| `business_scope` | Enterprise | `productSystem` | Best current fit for business / product scope |
| `signature` | Enterprise | `positioning` | Best current fit for brand positioning / slogan |
| `license_code` | Enterprise | `licenseCode` | Business license number |
| `business_license` | Enterprise | `certifications` partial | Current script stores license image URL in certifications summary |
| `legal_person` | Enterprise | `certifications` partial | Stored in certifications summary text |
| `register_capital` | Enterprise | `registeredCapital` | Registered capital |
| `start_deadline` | Enterprise | `foundedAt` | Legacy company start date |
| `province_name` | Enterprise | `region` | Province-level region |
| `city_name` | Enterprise | `area` | Province + city composed display area |
| `divide` | Enterprise | `region/area` fallback | Legacy area fallback |
| `video` | Enterprise | `videoUrl` | Enterprise video |
| `status` | Enterprise | `verificationStatus` / `verifiedAt` | `1 -> approved` |
| `tag_names` | Enterprise | derived display tags | Not currently stored as standalone column, but should drive front-end tags and future brand facets |

### Front-End Display Layer -> Brand

Current code gap:

- Existing `Brand` model is not enough for company migration display
- Existing `/brands` pages render `Article`, not `Brand`

Target mapping for the new `Brand` display layer should be:

| Legacy field / derived rule | New target | Destination field | Notes |
| --- | --- | --- | --- |
| `short_name` / `name` | Brand | `name` | Public brand name |
| `signature` | Brand | `positioning` | One-line positioning |
| `business_scope` | Brand | `productStructure` or `materialSystem` | Needs final split rule if scope is structured |
| `website` | Brand | `contactUrl` | Click-through URL |
| `license_code` / certification assets | Brand | `certUrl` | Optional certification landing |
| `is_vip` | Brand display rule | `isRecommend` (new) | VIP should be recommendable by rule, not hardcoded |
| `rankingWeight` / VIP | Brand display rule | `sortOrder` / weight (new) | VIP first, then manual sort, then freshness |
| `template` derived from VIP/video | Brand display rule | `displayTemplate` (new) | Keep `brand_showcase`, `professional_service`, `simple_elegant` logic |
| bound `Enterprise.id` | Brand | `enterpriseId` (new) | Brand must be linked to enterprise, not standalone fake data |
| `region` / `area` / `tag_names` | Brand display filter | searchable facets (new) | Used in `/brands/all` filters |

### Award / Ranking Layer -> Award

Current code gap:

- Existing `Award` is standalone and does not bind enterprise

Target mapping for ranking / award identity should be:

| Legacy field / derived rule | New target | Destination field | Notes |
| --- | --- | --- | --- |
| legacy ranking membership / recommendation identity | Award relation | `awardId <-> enterpriseId` relation (new) | Must not replace enterprise master data |
| legacy “brand榜 / 华点榜 / 推荐身份” | Award | `title`, `year`, `description` | Ranking identity only |
| enterprise on list | Award relation | `sortOrder` / ranking note (new) | Display order inside award list |

## VIP Logic To Preserve

Legacy VIP value is business-critical and must survive migration.

Current confirmed mapping:

- `is_vip = 1`
  - `Member.memberType = enterprise_advanced`
  - `Member.rankingWeight = higher`
  - `member_site_settings.template = brand_showcase`

Non-VIP:

- `Member.memberType = enterprise_basic`
- lower ranking weight
- template falls back by content richness

Target front-end effect:

- VIP enterprise appears first in recommendation zone
- VIP has stronger card / badge / template treatment
- ordinary enterprise stays in standard list

## Implementation Gap Summary

Before final import + launch, these gaps must be closed:

1. `Brand` needs enterprise relation and display-control fields
2. `/brands` and `/brands/all` must switch from article-driven to enterprise/brand-driven rendering
3. backend needs enterprise + brand display management
4. award relation for enterprise ranking identity must be added if ranking data exists

## Current Recommended Build Order

1. Lock data mapping
2. Extend schema for `Brand` display relation and control fields
3. Extend import script to write `Member + Enterprise + Brand-display metadata`
4. Refactor `/brands` front-end to read migrated enterprise/brand data
5. Add backend management for enterprise/brand display control
6. Run dry-run import
7. Run production import with rollback-ready backup
