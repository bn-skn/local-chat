FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Порт
EXPOSE 5173

# Запуск dev сервера
CMD ["npm", "run", "dev", "--", "--host"]
