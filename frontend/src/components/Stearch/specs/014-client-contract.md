# Spec 014: what RomM offers clients

**Status:** documents the API as it stands.
**Source of intent:** the user: do what Argosy does, better than Argosy, so it has less to carry.

## Search

`GET /api/roms` with `search_term` and the filter params. RomM matches and ranks; a client shouldn't reimplement either while online. `with_filter_values=true` returns the facets for the current result set.

## Buckets

`with_char_index=true` returns `char_index`, a map of bucket name to the offset of its first game, for the current sort. Despite the name, it now covers more than letters.

| `order_by`           | Bucket        | Example       |
| -------------------- | ------------- | ------------- |
| `name`               | First letter  | `A`           |
| `platform_id`        | Platform name | `PlayStation` |
| `average_rating`     | Whole point   | `87`          |
| `first_release_date` | Year          | `1994`        |
| `created_at`         | Year          | `2026`        |
| `last_played`        | Year          | `2026`        |
| `rating`             | Value         | `8`           |
| `difficulty`         | Value         | `3`           |
| `fs_size_bytes`      | Band          | `1–4 GB`      |
| `hltb_main_story`    | Band          | `10–20 h`     |

A game with no value is in `Unknown`, always last. Band edges live in one table, `_BUCKET_BANDS` in `roms_handler.py`, and are guesses to tune against real stats.

## Smart collections

`filter_criteria` is free-form JSON, and may carry `order_by` and `order_dir`. Clients should read it cautiously and show what they can't apply, as `store/saved-search.ts` does.

## Not offered

Play count and play time. They aren't sortable columns: RomM is primarily an administrative platform, and a client that launches games is where that data starts. If it becomes cheap to sort by, add a field registry entry and a bucket.
