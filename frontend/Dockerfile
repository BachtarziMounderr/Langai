FROM node:24.21.0-bookworm-slim

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]
