FROM node:22-slim

WORKDIR /app

# install dependencies
COPY frontend/package*.json ./
RUN npm ci

# copy source
COPY frontend/ ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
