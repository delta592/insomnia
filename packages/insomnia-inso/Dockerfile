# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89

# This Dockerfile is intended for CI use only
# It assumes inso-linux-VERSION.tar.xz exists in /packages/insomnia-inso/artifacts
# You can run `npm run inso-package && npm run inso-package:artifacts` on a linux host OR
# `curl -LO "https://github.com/Kong/insomnia/releases/download/lib%40<version>/inso-linux-<version>.tar.xz"`

FROM docker.io/ubuntu:26.04@sha256:7c2884fd32770fc6c173b78e0dc2278a2851d89f5447919edbc45475ac55dd6a AS fetch

COPY ./artifacts/inso-linux-*.tar.xz /tmp/inso.tar.xz
RUN apt-get update && apt-get install -y xz-utils && rm -rf /var/lib/apt/lists/*
RUN tar -C /usr/bin -xvf /tmp/inso.tar.xz

FROM docker.io/ubuntu:26.04@sha256:7c2884fd32770fc6c173b78e0dc2278a2851d89f5447919edbc45475ac55dd6a
COPY --from=fetch /usr/bin/inso /usr/bin/inso
RUN chmod +x /usr/bin/inso
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/usr/bin/inso"]
