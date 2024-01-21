import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "true-myth";

type CustomError = {
  message: string;
  fault: "us" | "user";
  source: string;
  error: Error;
};

type ResultingPrismaClient<
  ErrorType,
  ModelKey = Prisma.TypeMap["meta"]["modelProps"]
> = {
  [Key in keyof PrismaClient]: Key extends ModelKey
    ? {
        [FnKey in keyof PrismaClient[Key]]: PrismaClient[Key][FnKey] extends (
          ...args: infer Args
        ) => infer Return
          ? (...args: Args) => Result<Awaited<Return>, ErrorType>
          : never;
      }
    : PrismaClient[Key];
};

function createResultingClient(
  client: PrismaClient
): ResultingPrismaClient<CustomError> {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return Result.ok(await query(args));
          } catch (e) {
            return Result.err({
              message: `Failed to ${operation} ${model} with args ${JSON.stringify(
                args
              )}`,
              fault: "us",
              source: "prisma",
              error: e,
            });
          }
        },
      },
    },
  }) as unknown as ResultingPrismaClient<CustomError>;
}

const normalClient = new PrismaClient();
const ourClient = createResultingClient(normalClient);

const nresult = await normalClient.user.findMany();
const oresult = await ourClient.user.findMany();

const nresult2 = await normalClient.user.findMany({ include: { posts: true } });
const oresult2 = await ourClient.user.findMany({ include: { posts: true } });
