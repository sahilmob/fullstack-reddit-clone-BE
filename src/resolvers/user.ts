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
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: ApolloContext) {
    const userId = req.session!.userId;

    if (!userId) return null;

    const user = await em.findOne(User, { id: userId });

    return user;
  }

  @Mutation(() => UserResponse, { nullable: true })
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: ApolloContext
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

    req.session!.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: ApolloContext
  ): Promise<UserResponse> {
    let user;
    try {
      user = await em.findOne(User, { username: options.username });
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

      req.session!.userId = user.id;
    } catch (error) {
      return error;
    }
    return { user };
  }
}
