import { faker } from "@faker-js/faker";
import fs from "fs";

const LEADS_COUNT = 10000;

const createId = () => faker.string.uuid();

const createAddress = () => {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  };
};

const createProposal = (leadId: string) => {
  const createdDate = faker.date.past();
  return {
    id: createId(),
    leadId: leadId,
    contractId: createId(),
    status: faker.helpers.arrayElement(["pending", "approved", "rejected"]),
    createdAt: createdDate,
    updatedAt: faker.date.between({ from: createdDate, to: new Date() }),
    value: parseFloat(faker.finance.amount({ min: 1000, max: 50000, dec: 2 })),
  };
};

const createContact = (leadId: string) => {
  return {
    id: createId(),
    userId: faker.datatype.boolean() ? createId() : undefined,
    leadId: leadId,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
  };
};

const createLead = () => {
  const leadId = createId();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const numProposals = faker.number.int({ min: 0, max: 3 });

  const proposalsArray = Array.from({ length: numProposals }).map(() =>
    createProposal(leadId)
  );

  return {
    id: leadId,
    capturedName: `${firstName} ${lastName}`,
    capturedEmail: faker.internet.email({ firstName, lastName }),

    address: createAddress(),

    contact: createContact(leadId),
    proposals: proposalsArray,
  };
};

export async function generateData() {
  return await new Promise((resolve, reject) => {
    try {
      console.log(`Generating ${LEADS_COUNT} leads...`);
      const leads: any[] = [];
      for (let i = 0; i < LEADS_COUNT; i++) {
        leads.push(createLead());
      }
      const jsonOutput = JSON.stringify(leads, null, 2);
      fs.writeFileSync(`${__dirname}/data.json`, jsonOutput);
      console.log(`Success! data.json created with ${leads.length} items.`);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}
