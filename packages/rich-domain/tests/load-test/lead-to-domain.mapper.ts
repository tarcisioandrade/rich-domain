import { Id, Mapper } from "../../src";
import { Address, Contact, Lead, Proposal } from "./entities";

export class LeadToDomainMapper extends Mapper<any, Lead> {
  public build(props: any): Lead {
    return new Lead({
      id: Id.from(props.id),
      capturedName: props.capturedName,
      capturedEmail: props.capturedEmail,
      address: new Address(props.address),
      contact: new Contact({
        ...props.contact,
        id: Id.from(props.contact.id),
      }),
      proposals: props.proposals.map(
        (proposal: any) =>
          new Proposal({
            ...proposal,
            id: Id.from(proposal.id),
          })
      ),
    });
  }
}
