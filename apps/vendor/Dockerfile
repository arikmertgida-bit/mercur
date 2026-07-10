# Vendor panel — serves the pre-built Vite dist via nginx.
# The dist/ directory is produced by running `medusa build` in packages/api
# (the admin-ui and vendor-ui Mercur modules build the Vite apps as part of
# the Medusa build pipeline, outputting to apps/vendor/dist/).
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
