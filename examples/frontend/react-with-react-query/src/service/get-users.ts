import { PaginatedResult, type Criteria } from "@woltz/rich-domain";
import users from "./users.json";

export type TestUser = {
  id: string;
  name: string;
  age: number;
  status: "active" | "inactive";
};

export async function getUsers(
  Criteria: Criteria
): Promise<PaginatedResult<TestUser>> {
  try {
    const response = Promise.resolve(users);
    const data = (await response) as TestUser[];
    const result = PaginatedResult.fromArray<TestUser>(data, Criteria);

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
