#!/usr/bin/env bash
# Whole-library window timing on master, pr-5636 and lite, one branch at a time.
# Writes ../__WINDOW_PERF/library-<name>.tsv for each branch, then returns to the starting branch.
#   ROMM_ADMIN_PASSWORD='...' ./run_window_all.sh
set -eu

: "${ROMM_ADMIN_PASSWORD:?set ROMM_ADMIN_PASSWORD first}"
export PLATFORM=all OFFSET="${OFFSET:-32400}" RUNS="${RUNS:-10}"

cd "$(dirname "$0")"
OUT=../__WINDOW_PERF
mkdir -p "${OUT}"
START=$(git branch --show-current)

if [[ -n "$(git status --short | grep -v '^??' || true)" ]]; then
	echo "Tracked changes present. Commit or stash them first." >&2
	exit 1
fi

stop_server() {
	local pids
	pids=$(ss -ltnp 2>/dev/null | grep ':5000 ' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true)
	for p in ${pids}; do kill -TERM "${p}" 2>/dev/null || true; done
	for _ in $(seq 1 20); do
		ss -ltn 2>/dev/null | grep -q ':5000 ' || return 0
		sleep 1
	done
	echo "Port 5000 still busy after stop." >&2
	exit 1
}

run_one() {
	local branch=$1 name=$2
	echo "=== ${name} (${branch})"
	git switch -q "${branch}"
	uv sync --all-extras --dev -q
	stop_server
	../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5000 >"${OUT}/server-${name}.log" 2>&1 &
	local ok=0
	for _ in $(seq 1 60); do
		if [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:5000/api/heartbeat)" == 200 ]]; then
			ok=1
			break
		fi
		sleep 1
	done
	if [[ ${ok} -ne 1 ]]; then
		echo "Server for ${name} did not answer. See ${OUT}/server-${name}.log" >&2
		stop_server
		exit 1
	fi
	./window_curl.sh | tee "${OUT}/library-${name}.tsv"
	stop_server
}

run_one master master
run_one pr-5636 pr-5636
run_one perf/windows-by-id-lean lite

git switch -q "${START}"
echo "=== done. Back on ${START}. Files:"
ls -l "${OUT}"/library-*.tsv
