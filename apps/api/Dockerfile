# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# The lines below set STORE_CORS/ADMIN_CORS/VENDOR_CORS/AUTH_CORS as plain
# ENV values. None of these are secrets — they are public CORS allow-lists
# (origin URLs only), required at build time purely because
# medusa-config.ts reads them with a non-null assertion. BuildKit's linter
# flags AUTH_CORS solely because its name contains "AUTH"; this directive
# suppresses that specific false positive without disabling other real
# secret checks.
FROM node:22-alpine

# `medusa build`'in ürettiği .medusa/server/package.json, @mercurjs/* paketlerini
# workspace protokolü olmadan "*" sürümüyle listeler. Bu bundle'ı `npm install`
# ile kurmak, npm'in bu paketleri gerçek npm registry'sinden (yerel workspace
# kaynağı yerine, tamamen farklı/eski bir sürümle) çekmesine yol açar. bun,
# workspace'i doğru şekilde symlink'leyerek yerel packages/* kaynağını kullanır.
RUN npm install -g bun@1.3.14 @medusajs/cli ts-node

WORKDIR /monorepo

COPY . .

RUN bun install --frozen-lockfile

# CORS değerleri medusa-config.ts içinde non-null assertion ile okunuyor;
# derleme anında gerçek bağlantı açılmıyor ama tanımlı olmaları gerekiyor.
# Burada docker-compose.yml'deki çalışma zamanı değerleriyle birebir aynı
# değerler kullanılır, böylece derleme ve çalışma zamanı arasında fark olmaz.
ENV STORE_CORS=http://storefront:3000,http://localhost:3000
ENV ADMIN_CORS=http://admin:7000,http://localhost:7000
ENV VENDOR_CORS=http://vendor:7001,http://localhost:7001
ENV AUTH_CORS=http://admin:7000,http://vendor:7001,http://localhost:7000,http://localhost:7001,http://localhost:3000,http://storefront:3000

# The MinIO file provider options are validated (requireEnv) at config-load
# time too, for the same reason as CORS above — no real connection happens
# during build, but the values must be defined or the build step throws.
# These are build-time PLACEHOLDERS only (never real credentials — unlike
# CORS these are secrets, so they must not be baked into the image layer).
# docker-compose.yml's `environment:` block supplies the real MinIO
# endpoint/credentials at container start, which overrides these ENV
# defaults per standard Docker precedence.
ENV MINIO_ENDPOINT=http://minio:9000
ENV MINIO_FILE_URL=http://localhost:9002/build-placeholder
ENV MINIO_ACCESS_KEY_ID=build-placeholder
ENV MINIO_SECRET_ACCESS_KEY=build-placeholder
ENV MINIO_BUCKET=build-placeholder
ENV MINIO_REGION=us-east-1

# turbo, apps/api'yi build etmeden önce @mercurjs/core gibi workspace
# bağımlılıklarını (^build) kendi tsconfig'leriyle önce derler — .medusa
# çıktısı .dockerignore ile context dışı bırakıldığı için bu adım şart.
RUN bunx turbo run build --filter=@acme/api

# medusa build'in ürettiği .medusa/server/package.json, npm'e bunun ayrı bir
# proje kökü olduğunu düşündürür. Bu yüzden `medusa db:migrate --execute-safe-links`
# çalışma zamanında iç olarak tetiklediği `npm exec @mercurjs/cli codegen`,
# workspace'te zaten mevcut @mercurjs/cli'yi bulamaz ve npm registry'sinden
# (2000+ bağımlılığıyla) sıfırdan kurmaya çalışarak dakikalarca donar.
# node_modules'ı workspace köküne symlink'leyerek hem npm hem node çözümlemesi
# yerel pristine paketi anında bulur.
RUN ln -s /monorepo/node_modules /monorepo/apps/api/.medusa/server/node_modules

WORKDIR /monorepo/apps/api/.medusa/server

EXPOSE 9000

ENV NODE_ENV=production

CMD ["sh", "-c", "medusa db:migrate --execute-safe-links && medusa start"]
