FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV DB_HOST=taskdb \
    DB_PORT=3306 \
    DB_USER=root \
    DB_PASSWORD=averysecurepassword \
    DB_NAME=taskmanager

CMD ["node", "index.js"]