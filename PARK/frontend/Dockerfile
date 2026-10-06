# PARK — Frontend Production Image
# =======================================
# Multi-stage: build the static Vite bundle in a Node image, then
# serve it with nginx (a full Node runtime isn't needed just to serve
# static files — nginx is lighter and this is standard practice).
#
# IMPORTANT: Vite bakes VITE_API_URL and VITE_SUPABASE_* into the JS
# bundle at BUILD time (import.meta.env is compile-time, not runtime,
# unlike backend env vars). That means these must be passed as
# --build-arg values, not just set in a running container's
# environment — setting them only at `docker run` time would have NO
# effect on an already-built bundle.

FROM node:20-alpine AS build
WORKDIR /app

# Build args → env vars Vite reads during `npm run build`.
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
