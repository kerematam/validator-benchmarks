#!/bin/sh

set -eu

benchmark_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
benchmark_uid=$(id -u)
benchmark_gid=$(id -g)
benchmark_image="structured-report-validation-benchmark:bun-1.3.14"

docker build \
  --file "$benchmark_root/docker/benchmark.Dockerfile" \
  --tag "$benchmark_image" \
  "$benchmark_root"

docker run --rm \
  --network none \
  --cpus 4 \
  --memory 2g \
  --memory-swap 2g \
  --pids-limit 256 \
  --user "$benchmark_uid:$benchmark_gid" \
  --volume "$benchmark_root:/workspace" \
  --workdir /workspace \
  "$benchmark_image" \
  bun run benchmark "$@"
