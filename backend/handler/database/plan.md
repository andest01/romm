3238668397351434677 2123 9 235.9 639.4 592416 DECLARE "c_71d4e155d7b0_1" CURSOR FOR SELECT CAST(roms_facets.genres AS TEXT) AS genres, CAST(roms_facets.franchises AS TEXT) AS franchises, CAST(roms_facets.collections AS TEXT) AS collections, CAST(roms_facets.companies AS TEXT) AS companies, CAST(roms_facets.publishers AS TEXT) AS publishers, CAST(roms_facets.developers AS TEXT) AS developers, CAST(roms_facets.game_modes AS TEXT) AS game_modes, CAST(roms_facets.age_ratings AS TEXT) AS age_ratings, CAST(roms_facets.regions AS TEXT) AS regions, CAST(roms_facets.languages AS TEXT) AS languages, CAST(roms_facets.tags AS TEXT) AS tags, roms_facets.player_count, roms_facets.platform_id
FROM roms_facets
WHERE roms_facets.rom_id IN (SELECT roms.id
FROM roms LEFT OUTER JOIN rom_user ON rom_user.rom_id = roms.id AND rom_user.user_id = $1::INTEGER
WHERE rom_user.hidden IS false OR rom_user.hidden IS NULL)
5692415763417810005 1501 9 166.7 233.3 551088 WITH picked AS
(SELECT roms.group_key AS group_key
FROM roms JOIN rom_user ON rom_user.rom_id = roms.id
WHERE rom_user.user_id = $1::INTEGER AND roms.group_key IS NOT NULL AND (rom_user.hidden IS true OR rom_user.is_main_sibling IS true)),
ranked AS
(SELECT roms.id AS id, row_number() OVER (PARTITION BY roms.group_key ORDER BY coalesce(CAST(rom_user.is_main_sibling AS INTEGER), $2::INTEGER) DESC, roms.prerelease_rank ASC, CASE roms.generated_primary_region WHEN $3::VARCHAR THEN $4::INTEGER WHEN $5::VARCHAR THEN $6::INTEGER WHEN $7::VARCHAR THEN $8::INTEGER WHEN $9::VARCHAR THEN $10::INTEGER ELSE $11::INTEGER END ASC, roms.fs_name_no_ext ASC, roms.id ASC) AS row_num
FROM roms LEFT OUTER JOIN rom_user ON rom_user.rom_id = roms.id AND rom_user.user_id = $12::INTEGER
WHERE (rom_user.hidden IS false OR rom_user.hidden IS NULL) AND roms.group_key IN (SELECT picked.group_key
FROM picked)),
gallery AS
(SELECT roms.id AS id, roms.name_sort_key AS name_sort_key
FROM roms LEFT OUTER JOIN rom_user ON rom_user.rom_id = roms.id AND rom_user.user_id = $12::INTEGER
WHERE (rom_user.hidden IS false OR rom_user.hidden IS NULL) AND roms.is_group_default IS true AND (roms.group_key IS NULL OR (roms.group_key NOT IN (SELECT picked.group_key
FROM picked))) UNION ALL SELECT roms.id AS id, roms.name_sort_key AS name_sort_key
FROM roms JOIN ranked ON ranked.id = roms.id
WHERE ranked.row_num = $13::INTEGER)
SELECT gallery.id, SUBSTRING(gallery.name_sort_key FROM $14::INTEGER FOR $15::INTEGER) AS substring_1
FROM gallery ORDER BY gallery.name_sort_key, gallery.id
-6845838169565602215 1243 2 621.4 712.4 19504 SELECT collections_roms.collection_id, roms.id, roms.path_cover_s, roms.path_cover_l
FROM collections_roms JOIN roms ON roms.id = collections_roms.rom_id
WHERE collections_roms.collection_id IN ($1 /*, ... _/)
7065224727413081268 1224 57 21.5 125.3 401 SELECT sibling_roms.rom_id, roms.id, roms.fs_name_no_tags, roms.fs_name_no_ext, roms.name, coalesce(rom_user.is_main_sibling, $1) AS is_main_sibling
FROM sibling_roms JOIN roms ON roms.id = sibling_roms.sibling_rom_id LEFT OUTER JOIN rom_user ON rom_user.rom_id = sibling_roms.sibling_rom_id AND rom_user.user_id = $2::INTEGER
WHERE sibling_roms.rom_id IN ($3 /_, ... */)
-2630491496035586114 985 6 164.2 267.7 0 "EXPLAIN (ANALYZE, BUFFERS)
WITH picked AS (
-- this user's personal-pick groups: they hid a version or chose a main one
SELECT roms.group_key
FROM roms JOIN rom_user ON rom_user.rom_id = roms.id
WHERE rom_user.user_id = (SELECT id FROM users WHERE username = $1)
AND roms.group_key IS NOT NULL
AND (rom_user.hidden IS true OR rom_user.is_main_sibling IS true)
),
ranked AS (
-- every version in those groups, ranked: a visible one, the user's pick,
-- then the stored order. Only index columns, so the window stays index-only.
SELECT roms.id, rom_user.hidden,
row_number() OVER (
PARTITION BY roms.group_key
ORDER BY
CASE WHEN (rom_user.hidden IS false OR rom_user.hidden IS NULL) THEN $2 ELSE $3 END ASC,
coalesce(CAST(rom_user.is_main_sibling AS INTEGER), $4) DESC,
roms.prerelease_rank ASC,
$5 ASC,
roms.fs_name_no_ext ASC,
roms.id ASC
) AS row_num
FROM roms
LEFT OUTER JOIN rom_user ON rom_user.rom_id = roms.id
AND rom_user.user_id = (SELECT id FROM users WHERE username = $6)
WHERE roms.group_key IN (SELECT group_key FROM picked)
),
gallery AS (
(
-- half A: the stored default, outside this user's personal-pick groups
SELECT roms.id, roms.name_sort_key
FROM roms
LEFT OUTER JOIN rom_user ON rom_user.rom_id = roms.id
AND rom_user.user_id = (SELECT id FROM users WHERE username = $7)
WHERE roms.is_group_default IS true
AND (roms.group_key IS NULL OR roms.group_key NOT IN (SELECT group_key FROM picked))
AND (rom_user.hidden IS false OR rom_user.hidden IS NULL)
)
UNION ALL
(
-- half B: each group's rank 1, joined to roms only for its name
SELECT roms.id, roms.name_sort_key
FROM ranked
JOIN roms ON roms.id = ranked.id
WHERE ranked.row_num = $8 AND (ranked.hidden IS false OR ranked.hidden IS NULL)
)
)
SELECT id, substring(name_sort_key FROM $9 FOR $10) AS letter
FROM gallery
ORDER BY name_sort_key, id"
