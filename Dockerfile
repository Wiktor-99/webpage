FROM node:lts AS init

WORKDIR /app

RUN npx create-docusaurus@latest temp-project classic --javascript --skip-install

FROM node:lts AS development

WORKDIR /app

COPY --from=init /app/temp-project/ ./

RUN npm install


FROM development AS build
WORKDIR /app

RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]