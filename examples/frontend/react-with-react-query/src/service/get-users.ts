import { PaginatedResult, type Criteria } from "@woltz/rich-domain";
import users from "./users.json";

export type TestUser = {
  id: string;
  name: string;
  age: number;
  user: {
    lead: {
      title: string;
    }
  }[]
  status: "active" | "inactive";
};

export async function getUsers(
  Criteria: Criteria
): Promise<PaginatedResult<TestUser>> {
  try {
    const response = Promise.resolve(users);
    const data = (await response) as TestUser[];
    const result = PaginatedResult.fromArray<TestUser>(data, Criteria);

    console.log("result", result);

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
