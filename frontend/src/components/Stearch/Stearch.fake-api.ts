import type { CustomLimitOffsetPage_SimpleRomSchema_ as GetRomsResponse } from "@/__generated__/models/CustomLimitOffsetPage_SimpleRomSchema_";
import type { SimpleRomSchema } from "@/__generated__/models/SimpleRomSchema";
import type { GetRomsParams } from "@/services/api/rom";
import { romFixture, romMetadataFixture } from "@/utils/rom.fixtures";

const PLATFORMS = ["SNES", "PlayStation", "Game Boy", "Saturn"];
const REGIONS = ["USA", "Japan", "Europe"];
const LANGUAGES = ["en", "ja"];
const TITLES = [
  "Actraiser",
  "Bust-A-Move",
  "Chrono Trigger",
  "Doom",
  "Earthbound",
  "F-Zero",
  "Metroid",
  "Zelda",
];
const NO_FILTER_VALUES: GetRomsResponse["filter_values"] = {
  genres: [],
  franchises: [],
  collections: [],
  companies: [],
  publishers: [],
  developers: [],
  game_modes: [],
  age_ratings: [],
  player_counts: [],
  regions: [],
  languages: [],
  tags: [],
  platforms: [],
};

/** Full API objects: the same shape `GET /roms` returns. */
export const STEARCH_LIBRARY: SimpleRomSchema[] = Array.from(
  { length: 1000 },
  (_, i) => {
    const name = `${TITLES[i % TITLES.length] ?? "Game"} ${i + 1}`;
    return romFixture({
      id: i + 1,
      name,
      fs_name: `${name} (USA).rom`,
      platform_id: (i % PLATFORMS.length) + 1,
      platform_display_name: PLATFORMS[i % PLATFORMS.length] ?? "SNES",
      fs_size_bytes: ((i * 7919) % 900) * 1_048_576 + 524_288,
      created_at: new Date(
        Date.UTC(2024, 0, 1 + ((i * 37) % 700)),
      ).toISOString(),
      regions: [REGIONS[i % REGIONS.length] ?? "USA"],
      languages: i % 2 === 0 ? ["en"] : ["en", "ja"],
      url_cover: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="420"><rect width="280" height="420" fill="hsl(${(i * 47) % 360} 60% 45%)"/></svg>`,
      )}`,
      metadatum: romMetadataFixture({
        rom_id: i + 1,
        first_release_date: Date.UTC(1985 + (i % 35), i % 12, 1),
        average_rating: i % 5 === 0 ? null : 2 + (i % 30) / 10,
      }),
      hltb_metadata:
        i % 3 === 0 ? null : { main_story: (i % 40) * 3600 + 1800 },
    });
  },
);

function compare(a: SimpleRomSchema, b: SimpleRomSchema, key: string): number {
  if (key === "fs_size_bytes") return a.fs_size_bytes - b.fs_size_bytes;
  if (key === "created_at") return a.created_at.localeCompare(b.created_at);
  if (key === "first_release_date") {
    return (
      (a.metadatum.first_release_date ?? 0) -
      (b.metadatum.first_release_date ?? 0)
    );
  }
  if (key === "average_rating") {
    return (
      (a.metadatum.average_rating ?? 0) - (b.metadatum.average_rating ?? 0)
    );
  }
  return (a.name ?? a.fs_name).localeCompare(b.name ?? b.fs_name);
}

export function buildFakePage(params: GetRomsParams): GetRomsResponse {
  const term = params.searchTerm?.trim().toLowerCase() ?? "";
  const orderBy = params.orderBy ?? "name";
  const direction = params.orderDir === "desc" ? -1 : 1;
  const regions = params.selectedRegions ?? [];
  const languages = params.selectedLanguages ?? [];
  const platformIds = params.platformIds ?? [];
  const matches = STEARCH_LIBRARY.filter(
    (rom) =>
      (rom.name ?? rom.fs_name).toLowerCase().includes(term) &&
      (platformIds.length === 0 || platformIds.includes(rom.platform_id)) &&
      (regions.length === 0 || rom.regions.some((r) => regions.includes(r))) &&
      (languages.length === 0 ||
        rom.languages.some((l) => languages.includes(l))),
  ).sort((a, b) => compare(a, b, orderBy) * direction);

  const charIndex: Record<string, number> = {};
  if (orderBy === "name") {
    for (const [position, rom] of matches.entries()) {
      charIndex[(rom.name ?? rom.fs_name).charAt(0).toUpperCase()] ??= position;
    }
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 48;
  return {
    items: matches.slice(offset, offset + limit),
    total: matches.length,
    limit,
    offset,
    char_index: charIndex,
    rom_id_index: matches.map((rom) => rom.id),
    filter_values: {
      ...NO_FILTER_VALUES,
      genres: ["Action", "Platformer", "RPG"],
      tags: ["Co-op", "Classic"],
      regions: REGIONS,
      languages: LANGUAGES,
      platforms: [1, 2, 3, 4],
    },
  };
}

/** Stands in for `romApi.getRoms`, with the same call and return shape. */
export async function fakeGetRoms(
  params: GetRomsParams,
): Promise<{ data: GetRomsResponse }> {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
  return { data: buildFakePage(params) };
}
