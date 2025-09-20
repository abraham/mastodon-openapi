# Enum Duplicates

This document lists all enums that have the same values and appear in multiple places.

**Total duplicate enum patterns found:** 20

## Enum: home, notifications, public, ... (5 values)

**Values:** `["home","notifications","public","thread","account"]`

**Occurs in 8 places:**

- Entity: `Filter` → Property: `context`
- Entity: `V1_Filter` → Property: `context`
- Entity: `Filter` → Property: `context`
- Entity: `V1` → Property: `Filter_context`
- Method: `post//api/v1/filters/context` → Parameter: `requestBody`
- Method: `put//api/v1/filters//id//context` → Parameter: `requestBody`
- Method: `post//api/v2/filters/context` → Parameter: `requestBody`
- Method: `put//api/v2/filters//id//context` → Parameter: `requestBody`

## Enum: mention, status, reblog, ... (10 values)

**Values:** `["mention","status","reblog","follow","follow_request","favourite","poll","update","admin.sign_up","admin.report"]`

**Occurs in 8 places:**

- Method: `get//api/v1/notifications` → Parameter: `exclude_types`
- Method: `get//api/v1/notifications` → Parameter: `types`
- Method: `get//api/v2/alpha/notifications` → Parameter: `exclude_types`
- Method: `get//api/v2/alpha/notifications` → Parameter: `grouped_types`
- Method: `get//api/v2/alpha/notifications` → Parameter: `types`
- Method: `get//api/v2/notifications` → Parameter: `exclude_types`
- Method: `get//api/v2/notifications` → Parameter: `grouped_types`
- Method: `get//api/v2/notifications` → Parameter: `types`

## Enum: public, unlisted, private, ... (4 values)

**Values:** `["public","unlisted","private","direct"]`

**Occurs in 6 places:**

- Entity: `Preferences` → Property: `posting:default:visibility`
- Entity: `Status` → Property: `visibility`
- Entity: `BaseStatus` → Property: `visibility`
- Entity: `Preferences` → Property: `posting:default:visibility`
- Entity: `Status` → Property: `visibility`
- Entity: `BaseStatus` → Property: `visibility`

## Enum: spam, legal, violation, ... (4 values)

**Values:** `["spam","legal","violation","other"]`

**Occurs in 5 places:**

- Entity: `Admin_Report` → Property: `category`
- Entity: `Report` → Property: `category`
- Entity: `Admin` → Property: `Report_category`
- Entity: `Report` → Property: `category`
- Method: `post//api/v1/reports/category` → Parameter: `requestBody`

## Enum: followed, list, none

**Values:** `["followed","list","none"]`

**Occurs in 4 places:**

- Entity: `List` → Property: `replies_policy`
- Entity: `List` → Property: `replies_policy`
- Method: `post//api/v1/lists/replies/policy` → Parameter: `requestBody`
- Method: `put//api/v1/lists//id//replies/policy` → Parameter: `requestBody`

## Enum: link, photo, video, ... (4 values)

**Values:** `["link","photo","video","rich"]`

**Occurs in 4 places:**

- Entity: `PreviewCard` → Property: `type`
- Entity: `Trends_Link` → Property: `type`
- Entity: `PreviewCard` → Property: `type`
- Entity: `Trends` → Property: `Link_type`

## Enum: pending, accepted, rejected, ... (6 values)

**Values:** `["pending","accepted","rejected","revoked","deleted","unauthorized"]`

**Occurs in 4 places:**

- Entity: `Quote` → Property: `state`
- Entity: `ShallowQuote` → Property: `state`
- Entity: `Quote` → Property: `state`
- Entity: `ShallowQuote` → Property: `state`

## Enum: none, disable, mark_statuses_as_sensitive, ... (7 values)

**Values:** `["none","disable","mark_statuses_as_sensitive","delete_statuses","sensitive","silence","suspend"]`

**Occurs in 2 places:**

- Entity: `AccountWarning` → Property: `action`
- Entity: `AccountWarning` → Property: `action`

## Enum: day, month

**Values:** `["day","month"]`

**Occurs in 2 places:**

- Entity: `Admin_Cohort` → Property: `frequency`
- Entity: `Admin` → Property: `Cohort_frequency`

## Enum: silence, suspend, noop

**Values:** `["silence","suspend","noop"]`

**Occurs in 2 places:**

- Entity: `Admin_DomainBlock` → Property: `severity`
- Entity: `Admin` → Property: `DomainBlock_severity`

## Enum: sign_up_requires_approval, sign_up_block, no_access

**Values:** `["sign_up_requires_approval","sign_up_block","no_access"]`

**Occurs in 2 places:**

- Entity: `Admin_IpBlock` → Property: `severity`
- Entity: `Admin` → Property: `IpBlock_severity`

## Enum: approved, rejected, pending

**Values:** `["approved","rejected","pending"]`

**Occurs in 2 places:**

- Entity: `Appeal` → Property: `state`
- Entity: `Appeal` → Property: `state`

## Enum: silence, suspend

**Values:** `["silence","suspend"]`

**Occurs in 2 places:**

- Entity: `DomainBlock` → Property: `severity`
- Entity: `DomainBlock` → Property: `severity`

## Enum: warn, hide, blur

**Values:** `["warn","hide","blur"]`

**Occurs in 2 places:**

- Entity: `Filter` → Property: `filter_action`
- Entity: `Filter` → Property: `filter_action`

## Enum: unknown, image, gifv, ... (5 values)

**Values:** `["unknown","image","gifv","video","audio"]`

**Occurs in 2 places:**

- Entity: `MediaAttachment` → Property: `type`
- Entity: `MediaAttachment` → Property: `type`

## Enum: mention, status, reblog, ... (14 values)

**Values:** `["mention","status","reblog","follow","follow_request","favourite","poll","update","admin.sign_up","admin.report","severed_relationships","moderation_warning","quote","quoted_update"]`

**Occurs in 2 places:**

- Entity: `Notification` → Property: `type`
- Entity: `Notification` → Property: `type`

## Enum: default, show_all, hide_all

**Values:** `["default","show_all","hide_all"]`

**Occurs in 2 places:**

- Entity: `Preferences` → Property: `reading:expand:media`
- Entity: `Preferences` → Property: `reading:expand:media`

## Enum: automatic, manual, denied, ... (4 values)

**Values:** `["automatic","manual","denied","unknown"]`

**Occurs in 2 places:**

- Entity: `QuoteApproval` → Property: `current_user`
- Entity: `QuoteApproval` → Property: `current_user`

## Enum: domain_block, user_domain_block, account_suspension

**Values:** `["domain_block","user_domain_block","account_suspension"]`

**Occurs in 2 places:**

- Entity: `RelationshipSeveranceEvent` → Property: `type`
- Entity: `RelationshipSeveranceEvent` → Property: `type`

## Enum: mention, status, reblog, ... (12 values)

**Values:** `["mention","status","reblog","follow","follow_request","favourite","poll","update","admin.sign_up","admin.report","severed_relationships","moderation_warning"]`

**Occurs in 2 places:**

- Entity: `NotificationGroup` → Property: `type`
- Entity: `NotificationGroup` → Property: `type`

