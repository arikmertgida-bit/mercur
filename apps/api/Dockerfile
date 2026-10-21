# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# The lines below set STORE_CORS/ADMIN_CORS/VENDOR_CORS/AUTH_CORS as plain
# ENV values. None of these are secrets — they are public CORS allow-lists
# (origin URLs only), required at build time purely because
# medusa-config.ts validates them via requireEnv() (throws if unset).
# BuildKit's linter flags AUTH_CORS solely because its name contains "AUTH";
# this directive suppresses that specific false positive without disabling
# other real secret checks.
FROM node:22-alpine AS builder

# `medusa build`'in ürettiği .medusa/server/package.json, @mercurjs/* paketlerini
# workspace protokolü olmadan "*" sürümüyle listeler. Bu bundle'ı `npm install`
# ile kurmak, npm'in bu paketleri gerçek npm registry'sinden (yerel workspace
# kaynağı yerine, tamamen farklı/eski bir sürümle) çekmesine yol açar. bun,
# workspace'i doğru şekilde symlink'leyerek yerel packages/* kaynağını kullanır.
# Sadece bun global olarak gerekli (bootstrap: bun install'ı çalıştırmak için
# bizzat bun'ın kendisi lazım). @medusajs/cli ve ts-node ARTIK global npm ile
# kurulmuyor — apps/api/package.json'da gerçek dependency oldukları için
# `bun install` onları zaten yerel node_modules'a doğru şekilde symlink'ler
# (aşağıdaki `bun run build` bu yerel ikilileri kullanır).
RUN npm install -g bun@1.3.14

WORKDIR /monorepo

COPY . .

RUN bun install --frozen-lockfile

# CORS değerleri medusa-config.ts içinde requireEnv() ile okunuyor;
# derleme anında gerçek bağlantı açılmıyor ama tanımlı olmaları gerekiyor.
# Burada docker-compose.yml'deki çalışma zamanı değerleriyle birebir aynı
# değerler kullanılır, böylece derleme ve çalışma zamanı arasında fark olmaz.
ENV STORE_CORS=http://storefront:3000,http://localhost:3000
ENV ADMIN_CORS=http://admin:7000,http://localhost:7000
ENV VENDOR_CORS=http://vendor:7001,http://localhost:7001
ENV AUTH_CORS=http://admin:7000,http://vendor:7001,http://localhost:7000,http://localhost:7001,http://localhost:3000,http://storefront:3000

# JWT_SECRET/COOKIE_SECRET are validated (requireEnv) at config-load time too,
# same reason as CORS above — no real token is signed during build, but the
# values must be defined or the build step throws. BUILD-TIME PLACEHOLDERS
# ONLY: docker-compose.yml's env_file/environment supplies the real secrets
# at container start, which overrides these ENV defaults per standard Docker
# precedence.
ENV JWT_SECRET=build-placeholder
ENV COOKIE_SECRET=build-placeholder

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
ENV MINIO_PUBLIC_URL=http://localhost:9002
ENV MINIO_ACCESS_KEY_ID=build-placeholder
ENV MINIO_SECRET_ACCESS_KEY=build-placeholder
ENV MINIO_BUCKET=build-placeholder
ENV MINIO_REGION=us-east-1

# Same build-time-placeholder treatment for the Meilisearch-backed catalog
# search lib (src/lib/search/), asserted at config-load time via requireEnv.
# docker-compose.yml's `environment:` block supplies the real host/key at
# container start.
ENV MEILISEARCH_HOST=http://meilisearch:7700
ENV MEILISEARCH_MASTER_KEY=build-placeholder

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
# yerel pristine paketi anında bulur. Bu symlink COPY --from ile runner'a
# da taşınır (hedef yol aynı göreli konumda yeniden oluşturulduğu için
# geçerliliğini korur).
RUN ln -s /monorepo/node_modules /monorepo/apps/api/.medusa/server/node_modules

# Araştırıldı ve CANLI test edildi: `bun install --frozen-lockfile --production`
# burada hiçbir fayda sağlamıyor — bun, zaten kurulu/frozen bir node_modules
# ağacını bu bayrakla prune ETMİYOR (yalnızca sıfırdan kurulumda devDependencies'i
# atlar); image boyutu ve node_modules/ içeriği birebir aynı kaldı. Bu yüzden
# eklenmedi — build süresini uzatan faydasız bir adım olurdu.

# --- Runner: yalnızca çalışma zamanında gereken şeyler ---
# builder'daki bun/npm global kurulumu, devDependencies dahil tüm monorepo
# kaynağı (apps/docs, apps/vendor, apps/admin-test — bu servisin hiç
# ihtiyacı olmayan ~140MB) ve "RUN chown -R" katman-şişmesi (~1.47GB, COPY
# sonrası ayrı bir layer'da yapılan chown, overlay fs'te tüm ağacı ikinci
# kez kopyalatıyordu) buraya hiç taşınmaz. @medusajs/cli ve ts-node de artık
# global npm ile BURADA ayrıca kurulmuyor (~618MB katman tasarrufu) —
# apps/api/package.json'daki gerçek dependency'leri sayesinde zaten
# apps/api/node_modules altında kopyalanıyorlar (aşağıdaki PATH ayarı ile
# çözümlenir).
FROM node:22-alpine AS runner

RUN addgroup -S medusa && adduser -S medusa -G medusa

WORKDIR /monorepo

# --chown tek bir COPY içinde uygulanır (ayrı bir "RUN chown -R" katmanı
# değil) — bu yüzden builder'daki gibi tüm ağacın ikinci kez kopyalanmasına
# yol açmaz.
COPY --from=builder --chown=medusa:medusa /monorepo/node_modules ./node_modules
COPY --from=builder --chown=medusa:medusa /monorepo/apps/api/.medusa ./apps/api/.medusa
# bun workspace'leri node_modules/@mercurjs/* için packages/* kaynağına
# symlink kurar (örn. @mercurjs/core -> ../../packages/core). packages/
# buraya kopyalanmazsa bu symlink'ler kırık kalır ve runtime'da modül
# çözümlemesi "Cannot find module"/"id must be a string" hatalarıyla çöker
# (canlı testte yakalandı).
COPY --from=builder --chown=medusa:medusa /monorepo/packages ./packages
# bun, apps/api'nin DOĞRUDAN bağımlılıklarını (@medusajs/medusa, @aws-sdk/*
# vb.) kök node_modules'a hoist etmek yerine apps/api/node_modules altında
# küçük symlink'ler olarak tutuyor (gerçek içerik yine kök node_modules/.bun
# deposunda). @medusajs/cli'nin runtime komut çözümlemesi (resolveLocalCommand
# → resolve-cwd) CWD'den (.medusa/server) yukarı doğru node_modules ararken
# tam olarak bu dizine ihtiyaç duyuyor — eksik olunca "@medusajs/medusa/
# commands/db-migrate" bulunamıyor ve CLI "id must be a string" ile çöküyor
# (canlı testte yakalandı).
COPY --from=builder --chown=medusa:medusa /monorepo/apps/api/node_modules ./apps/api/node_modules

USER medusa

WORKDIR /monorepo/apps/api/.medusa/server

EXPOSE 9000

ENV NODE_ENV=production
# CMD'nin çağırdığı `medusa` komutu artık global npm kurulumundan değil,
# apps/api/package.json'daki gerçek dependency'si sayesinde zaten kopyalanmış
# olan apps/api/node_modules/.bin/medusa'dan çözümlenir (bkz. runner
# başındaki yorum). ts-node de aynı şekilde apps/api/node_modules/ts-node
# olarak gerçek bir dependency — @medusajs/cli'nin production'da fallback
# loader olarak require('ts-node') çağırdığı davranış (canlı testte
# yakalandı) artık global kurulum yerine bu yerel paketle karşılanıyor.
ENV PATH="/monorepo/apps/api/node_modules/.bin:${PATH}"

CMD ["sh", "-c", "medusa db:migrate --execute-safe-links && medusa start"]
