import { Lead } from "./entities";
import fs from "fs";
import { generateData } from "./generate-data";
import { LeadToDomainMapper } from "./lead-to-domain.mapper";
import { PaginatedResult } from "../../src";

describe("Big Data", () => {
  let leads: Lead[] = [];

  function populateLeads() {
    const data = fs.readFileSync(`${__dirname}/data.json`, "utf8");
    const leadsData = JSON.parse(data);
    const toDomainMapper = new LeadToDomainMapper();
    leads = leadsData.map((lead: any) => toDomainMapper.build(lead));
  }

  beforeAll(async () => {
    const hasData = fs.existsSync(`${__dirname}/data.json`);
    if (!hasData) {
      await generateData();
    }
    populateLeads();
  });

  it("should have 10000 leads", () => {
    expect(leads.length).toBe(10000);
  });

  it("should deserialize to JSON correctly", () => {
    const paginationResult = PaginatedResult.create(
      leads,
      { page: 1, limit: 10, offset: 0 },
      1000
    );
    const json = paginationResult.toJSON();
    expect(json.data.length).toBe(10000);
  });
});
