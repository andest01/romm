import type romApi from "@/services/api/rom";

/** Where pages of roms come from: the real API in the app, a fake in stories
 *  and tests. Typed from `romApi.getRoms`, so a fake must match the real shape. */
export type StearchSource = (
  params: Parameters<typeof romApi.getRoms>[0],
) => Promise<Pick<Awaited<ReturnType<typeof romApi.getRoms>>, "data">>;
