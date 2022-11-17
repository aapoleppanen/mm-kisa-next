FROM node:18 AS dependencies
WORKDIR /app
COPY package*json ./
RUN npm ci --only-production

FROM node:18 AS builder
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npx prisma generate
RUN npx prisma migrate deploy
RUN npm run build

FROM node:18 as runner
WORKDIR /app

ENV NODE_ENV production

RUN ls -al

RUN addgroup --system -gid 1001 nodejs
RUN adduser --system -uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]