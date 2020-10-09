import { Arg, Ctx, Field, InputType, Mutation, Resolver } from "type-graphql";
import argon2 from "argon2";

import { User } from "../entities";
import { ApolloContext } from "../types";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@Resolver()
export class UserResolver {
  @Mutation(() => User, { nullable: true })
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext
  ): Promise<User> {
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    await em.persistAndFlush(user);
    return user;
  }
}
