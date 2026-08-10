FROM oven/bun@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4

USER root

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    procps=2:4.0.4-9 \
    time=1.9-0.2+b1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
