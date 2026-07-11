# Vendor panel — serves the pre-built Vite dist via nginx.
# The dist/ directory is produced by running `bun run build` in apps/vendor
# (`tsc -b && vite build`) — NOT by `medusa build` in packages/api, which
# skips the panel Vite output entirely ("Skipping admin build").
#
# ARCH-01: BACKEND_URL bake edilmez; container başlatılırken
# docker-entrypoint.sh tarafından JS bundle içine enjekte edilir.
# Kullanım: docker run -e BACKEND_URL=https://api.example.com vendor-image
FROM nginx:alpine

ARG STOREFRONT_URL=http://localhost:3000
ENV STOREFRONT_URL=$STOREFRONT_URL

COPY apps/vendor/dist /usr/share/nginx/html/seller
COPY apps/vendor/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/vendor/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
