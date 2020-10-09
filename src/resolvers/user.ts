import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
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

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

// object types are what could be assigned to the return value
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse, { nullable: true })
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          { field: "username", message: "length must be greater than 2" },
        ],
      };
    }
    if (options.password.length <= 3) {
      return {
        errors: [
          { field: "password", message: "length must be greater than 3" },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [{ field: "username", message: "username already exists!" }],
        };
      }
      return { errors: [{ field: "", message: "unknown error" }] };
    }
    return { user };
  }

  @Query(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext
  ): Promise<UserResponse> {
    try {
      const user = await em.findOne(User, { username: options.username });
      if (!user) {
        return {
          errors: [{ field: "", message: "invalid username or password" }],
        };
      }

      const passwordMatches = await argon2.verify(
        user.password,
        options.password
      );
      if (!passwordMatches)
        return {
          errors: [{ field: "", message: "invalid username or password" }],
        };
      return { user };
    } catch (error) {
      return error;
    }
  }
}
