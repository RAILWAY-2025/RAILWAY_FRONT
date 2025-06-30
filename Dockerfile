# Build stage
FROM node:22 as build

# Set Node.js memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR ./

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:stable

# Copy built assets from build stage
COPY --from=build /FN/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Default to bash instead of starting the app
#CMD ["/bin/bash"]