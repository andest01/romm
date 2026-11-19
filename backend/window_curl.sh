#!/usr/bin/env bash
# Time one gallery window two ways: by offset, then by id. Output is TSV.
#   ROMM_ADMIN_PASSWORD=... ./window_curl.sh | tee window-<branch>.tsv
# Columns: path, ms, http, items, ids, run, url. Every request is printed.
set -eu

BASE=${BASE:-http://127.0.0.1:5000}
P=${PLATFORM:-15}
# PLATFORM=all runs the whole library: no platform filter on either request.
if [[ ${P} == all ]]; then PF=""; else PF="platform_ids=${P}&"; fi
OFF=${OFFSET:-1800}
RUNS=${RUNS:-10}
WINDOW=72

BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT

TOKEN=$(curl -s -X POST "${BASE}/api/token" \
	--data-urlencode "username=${ROMM_USER:-admin_1}" \
	--data-urlencode "password=${ROMM_ADMIN_PASSWORD}" \
	--data-urlencode "scope=roms.read platforms.read" | jq -r .access_token)
AUTH="Authorization: Bearer ${TOKEN}"

# Bootstrap: the platform's id index. The window's ids come from it.
BOOT=$(curl -s -H "${AUTH}" "${BASE}/api/roms?${PF}limit=${WINDOW}&offset=0&group_by_meta_id=true&with_rom_id_index=true&with_char_index=false&with_filter_values=false&with_total=false")
INDEX_LEN=$(jq '.rom_id_index | length' <<<"${BOOT}")
ID_COUNT=$(jq --argjson o "${OFF}" --argjson n "${WINDOW}" '.rom_id_index[$o:$o+$n] | length' <<<"${BOOT}")
IDS_Q=$(jq -r --argjson o "${OFF}" --argjson n "${WINDOW}" \
	'.rom_id_index[$o:$o+$n][] | "rom_ids=\(.)"' <<<"${BOOT}" | paste -sd'&' -)

echo "# platform=${P} offset=${OFF} index_length=${INDEX_LEN} ids_in_window=${ID_COUNT} runs=${RUNS}"
if [[ ${ID_COUNT} -ne ${WINDOW} ]]; then
	echo "# ABORT: the window needs ${WINDOW} ids; the index gave ${ID_COUNT} (index length ${INDEX_LEN})"
	exit 1
fi

OFFSET_URL="${BASE}/api/roms?${PF}limit=${WINDOW}&offset=${OFF}&order_by=name&order_dir=asc&group_by_meta_id=true&with_char_index=false&with_filter_values=false&with_total=false&with_rom_id_index=false"
BYID_URL="${BASE}/api/roms?${IDS_Q}"

# measure PATH URL IDS RUN -> one TSV row
measure() {
	local out code secs items
	out=$(curl -s -o "${BODY}" -w '%{http_code} %{time_total}' -H "${AUTH}" "$2")
	code=${out% *}
	secs=${out#* }
	items=$(jq '.items | length' "${BODY}" 2>/dev/null || echo ERR)
	printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$1" \
		"$(awk -v s="${secs}" 'BEGIN{printf "%.1f", s*1000}')" "${code}" "${items}" "$3" "$4" "$2"
}

ROWS=$(mktemp)
trap 'rm -f "$BODY" "$ROWS"' EXIT

printf 'path\tms\thttp\titems\tids\trun\turl\n' | tee "${ROWS}"
for run in $(seq 1 "${RUNS}"); do
	measure offset "${OFFSET_URL}" - "${run}" | tee -a "${ROWS}"
	measure by_id "${BYID_URL}" "${ID_COUNT}" "${run}" | tee -a "${ROWS}"
done

echo "# median ms per path (from the rows above)"
for path in offset by_id; do
	awk -F'\t' -v p="${path}" 'NR > 1 && $1 == p { print $2 }' "${ROWS}" | sort -g |
		awk -v p="${path}" '{ v[NR] = $1 }
        END {
          if (NR == 0) { printf "# %s: no data\n", p; exit }
          m = (NR % 2) ? v[(NR + 1) / 2] : (v[NR / 2] + v[NR / 2 + 1]) / 2
          printf "# %s\t%.1f ms\t%d requests\n", p, m, NR
        }'
done
