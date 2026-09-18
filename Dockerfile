# Use Node.js 20 as the base image.
# Your project is currently using Node.js 20.
FROM node:20

# Create /app as the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json first.
# This allows Docker to reuse the dependency-installation layer
# when your application code changes.
COPY package*.json ./

# Install all dependencies from package-lock.json.
RUN npm ci

# Copy the rest of your project into the container.
COPY . .

# Tell Docker that our Express application uses port 3000.
EXPOSE 3000

# Start the application using the existing npm start command.
CMD ["npm", "start"]