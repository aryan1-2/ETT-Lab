FROM node:18

WORKDIR /app

# install python for scripts
RUN apt-get update && apt-get install -y python3 python3-pip

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "app.js"]
