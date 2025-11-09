FROM node:lts-slim AS development

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl && \
    npm install -g live-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./website /app

EXPOSE 3000

CMD ["live-server", "--port=3000", "--host=0.0.0.0", "--no-browser", "--wait=100"]

FROM nginx:alpine AS production

COPY ./website /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
