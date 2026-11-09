import { computed, provide } from "vue";
import { GAME_MENU_BULK } from "@/components/GameActions/gameMenuExtra";
import { useFavoriteToggle } from "@/composables/useFavoriteToggle";
import { useSnackbar } from "@/composables/useSnackbar";
import collectionApi from "@/services/api/collection";
import romApi from "@/services/api/rom";
import storeCollections from "@/stores/collections";
import { selectSelectedIds } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";

// Stub words: move to locale keys before this leaves the fork.
const FAILED = "That didn't work. Try again.";

/** With a selection, the game menu's Like and Download act on all of it. */
export function useGameMenuBulk(): void {
  const store = stearchStore();
  const collections = storeCollections();
  const snackbar = useSnackbar();
  const { ensureFavoriteCollection } = useFavoriteToggle();
  const ids = computed(() => [...selectSelectedIds(store.state)]);
  const noun = computed(() =>
    ids.value.length === 1 ? "1 item" : `${ids.value.length} items`,
  );
  const allLiked = computed(() => {
    const liked = new Set(collections.favoriteCollection?.rom_ids ?? []);
    return ids.value.every((id) => liked.has(id));
  });
  const whenSelected = (label: () => string) =>
    computed(() => (ids.value.length > 0 ? label() : null));

  provide(GAME_MENU_BULK, {
    favoriteLabel: whenSelected(() =>
      allLiked.value
        ? `Remove ${noun.value} from favorites`
        : `Add ${noun.value} to favorites`,
    ),
    downloadLabel: whenSelected(() => `Download ${noun.value}`),
    async favorite() {
      try {
        const favorites = await ensureFavoriteCollection();
        const write = allLiked.value
          ? collectionApi.removeRomsFromCollection
          : collectionApi.addRomsToCollection;
        const { data } = await write(favorites.id, ids.value);
        collections.updateCollection(data);
      } catch {
        snackbar.error(FAILED);
      }
    },
    async download() {
      try {
        await romApi.bulkDownloadRoms({ romIDs: ids.value });
      } catch {
        snackbar.error(FAILED);
      }
    },
  });
}
