import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import { Post } from "../entities/Post";
import { ApolloContext } from "../types";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: ApolloContext): Promise<Post[]> {
    return em.find(Post, {});
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg("id", () => Int) id: number,
    @Ctx() { em }: ApolloContext
  ): Promise<Post | null> {
    return em.findOne(Post, {
      id,
    });
  }
}
