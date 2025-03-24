FROM node:lts AS init

WORKDIR /app

RUN npx create-docusaurus@latest temp-project classic --javascript --skip-install

FROM node:lts AS development

WORKDIR /app

COPY --from=init /app/temp-project/ ./

RUN npm install
