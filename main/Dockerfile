# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . ./

# Build frontend
RUN npm run build

# Clean up dev dependencies for smaller production image
RUN npm prune --production

# Expose backend port
EXPOSE 3001

# Start backend server  
CMD ["node", "server.js"]