FROM node:18-bullseye-slim

# Install LaTeX
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-science \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from the current directory (server/)
COPY package*.json ./
RUN npm install

# Copy everything else from the current directory (server/)
COPY . .

# Explicitly check if the file exists during build (for debugging)
RUN ls -la /app

EXPOSE 5000

# Start the server
CMD ["node", "index.js"]