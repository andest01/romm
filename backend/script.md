# Top: env (already set, shown for reference)

export OFFSET=1080
export RUNS=10
export ROMM_ADMIN_PASSWORD='<your password>'

# Setup

cd /home/user/romm/backend

# Branch 1: master

git switch master
uv sync --all-extras --dev

# Terminal A (leave running):

../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5000

# Terminal B (after the server is up):

./window_curl.sh | tee window-master.tsv

# Terminal A: Ctrl+C to stop the server

# Branch 2: pr-5636

git switch pr-5636
uv sync --all-extras --dev

# Terminal A:

../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5000

# Terminal B:

./window_curl.sh | tee window-pr-5636.tsv

# Terminal A: Ctrl+C

# Branch 3: lite

git switch perf/windows-by-id-lean
uv sync --all-extras --dev

# Terminal A:

../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5000

# Terminal B:

./window_curl.sh | tee window-lite.tsv

# Terminal A: Ctrl+C
