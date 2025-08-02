FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

# Khi container start, chạy importLocationData.js → setBucketPublic.js → npm start
CMD node src/scripts/importLocationData.js && node src/scripts/setBucketPublic.js && npm start
