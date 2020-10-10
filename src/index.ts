import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors"

import microConfig from "./mikro-orm.config";
import allResolvers from "./resolvers";
import { __prod__ } from "./constants";
import { ApolloContext } from "./types";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(cors({origin: "http://localhost:3000", credentials: true}))

  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
      },
      secret: "erggergefgwerfgqehweflerge",
      resave: false,
      saveUninitialized: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: allResolvers,
      validate: false,
    }),
    context: ({ req, res }): ApolloContext => ({
      req,
      res,
      em: orm.em.fork(),
    }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log("Server started on localhost:4000");
  });
};

main();
