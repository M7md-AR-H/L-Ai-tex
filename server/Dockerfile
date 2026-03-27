# Use an official, lightweight Node.js image based on Debian Linux
FROM node:18-bullseye-slim

# Install LaTeX and its necessary dependencies
# We use --no-install-recommends to keep the image size small for the Free tier
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your server code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the Express server
CMD ["node", "index.js"]