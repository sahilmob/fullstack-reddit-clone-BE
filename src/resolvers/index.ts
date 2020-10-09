import { HelloResolver } from "./hello";
import { PostResolver } from "./post";
import { UserResolver } from "./user";

const allResolvers: [Function, ...Function[]] = [
  HelloResolver,
  PostResolver,
  UserResolver,
];

export default allResolvers;

export { HelloResolver, PostResolver, UserResolver };
