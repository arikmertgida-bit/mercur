# Admin panel — serves the pre-built Vite dist via nginx.
# The dist/ directory is produced by running `bun run build` in apps/admin-test.
FROM nginx:alpine

COPY apps/admin-test/dist /usr/share/nginx/html/dashboard
COPY apps/admin-test/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
