import { z } from "zod";
import {
  Aggregate,
  Entity,
  EntityValidation,
  Id,
} from "../../src";

const DateSchema = z.union([z.date(), z.string().datetime()]);

const AddressProps = z.object({
  id: z.instanceof(Id),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
});

type AddressProps = z.infer<typeof AddressProps>;

export class Address extends Entity<AddressProps> {
  protected static validation: EntityValidation<AddressProps> = {
    schema: AddressProps,
  };
}

const ProposalProps = z.object({
  id: z.instanceof(Id),
  leadId: z.string(),
  contractId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  value: z.number(),
});

type ProposalProps = z.infer<typeof ProposalProps>;

export class Proposal extends Entity<ProposalProps> {
  protected static validation: EntityValidation<ProposalProps> = {
    schema: ProposalProps,
  };
}

const ContactProps = z.object({
  id: z.instanceof(Id),
  userId: z.string().optional(),
  leadId: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
});

type ContactProps = z.infer<typeof ContactProps>;

export class Contact extends Entity<ContactProps> {
  protected static validation: EntityValidation<ContactProps> = {
    schema: ContactProps,
  };
}

const ContractProps = z.object({
  id: z.instanceof(Id),
  proposalId: z.string(),
  proposal: z.instanceof(Proposal),
  signes: z.array(ContactProps),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  signedAt: DateSchema.optional(),
});

type ContractProps = z.infer<typeof ContractProps>;

export class Contract extends Aggregate<ContractProps> {
  protected static validation: EntityValidation<ContractProps> = {
    schema: ContractProps,
  };
}

const LeadProps = z.object({
  id: z.instanceof(Id),
  capturedName: z.string(),
  capturedEmail: z.string().email(),
  proposals: z.array(z.instanceof(Proposal)),
  address: z.instanceof(Address),
  contact: z.instanceof(Contact),
});

export type LeadProps = z.infer<typeof LeadProps>;

export class Lead extends Aggregate<LeadProps> {
  protected static validation: EntityValidation<LeadProps> = {
    schema: LeadProps,
  };
}
