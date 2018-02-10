FROM node:alpine
ADD . /seawars
WORKDIR /seawars
COPY . .
RUN npm install
EXPOSE 55555
CMD [ "node", "app.js" ]