FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

# Khi container start, chạy importLocationData.js trước rồi mới start app
CMD node src/scripts/importLocationData.js && npm start
