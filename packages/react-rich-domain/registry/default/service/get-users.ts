import {
  Criteria,
  PaginatedResult,
  type PaginatedJsonResult,
} from "@woltz/rich-domain";
import users from "./users.json";

export type TestUser = {
  id: string;
  name: string;
  age: number;
  status: "active" | "inactive";
  createdAt: string;
};

export async function getUsers(
  criteria: Criteria = Criteria.create<TestUser>()
): Promise<PaginatedJsonResult<TestUser>> {
  try {
    const response = Promise.resolve(users);
    const data = (await response) as TestUser[];
    const result = PaginatedResult.fromArray<TestUser>(data, criteria);

    return result.toJSON();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
