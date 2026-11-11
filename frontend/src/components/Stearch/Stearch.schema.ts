import { z } from "zod";
import type { CustomLimitOffsetPage_SimpleRomSchema_ as GetRomsResponse } from "@/__generated__/models/CustomLimitOffsetPage_SimpleRomSchema_";
import type {
  StearchCheckedRom,
  StearchPage,
} from "./store/stearch.state-props";

const romSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  fs_name: z.string(),
  platform_display_name: z.string(),
  fs_size_bytes: z.number(),
  created_at: z.string(),
  regions: z.array(z.string()),
  languages: z.array(z.string()),
  path_cover_small: z.string().nullable(),
  url_cover: z.string().nullable(),
  metadatum: z.object({
    first_release_date: z.number().nullable(),
    average_rating: z.number().nullable(),
  }),
  hltb_metadata: z
    .object({ main_story: z.number().exactOptional() })
    .nullable(),
}) satisfies z.ZodType<StearchCheckedRom>;

const pageSchema = z.object({
  items: z.array(romSchema),
  total: z.number().nullable(),
  char_index: z.record(z.string(), z.number()),
  rom_id_index: z.array(z.number()),
  filter_values: z.object({
    genres: z.array(z.string()),
    franchises: z.array(z.string()),
    collections: z.array(z.string()),
    companies: z.array(z.string()),
    publishers: z.array(z.string()),
    developers: z.array(z.string()),
    game_modes: z.array(z.string()),
    age_ratings: z.array(z.string()),
    player_counts: z.array(z.string()),
    regions: z.array(z.string()),
    languages: z.array(z.string()),
    tags: z.array(z.string()),
    platforms: z.array(z.number()),
  }),
});

/** The seam: throws on fields we read that don't match, and freezes the page.
 *  Roms keep every field, so existing views can take them. */
export function parsePage(data: GetRomsResponse): StearchPage {
  pageSchema.parse(data);
  data.items.forEach(Object.freeze);
  Object.freeze(data.items);
  Object.freeze(data.char_index);
  Object.freeze(data.rom_id_index);
  Object.values(data.filter_values).forEach(Object.freeze);
  Object.freeze(data.filter_values);
  return Object.freeze(data);
}
