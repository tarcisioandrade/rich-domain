import { Aggregate, DomainEvent, EntityHooks, Id } from "@woltz/rich-domain";

class TesteCreatedEvent extends DomainEvent<{ id: Id; name: string }> {}

class Teste extends Aggregate<{ id: Id; name: string }> {
  protected static hooks: EntityHooks<{ id: Id; name: string }, Teste> = {
    onCreate(entity) {
      if (entity.isNew()) {
        entity.addDomainEvent(
          new TesteCreatedEvent({ id: entity.id, name: entity.props.name })
        );
      }
    },
  };
}

const teste = new Teste({ id: new Id(), name: "Teste" });

console.log(teste.getUncommittedEvents());
