import { RepositoryImplementation } from '../core/application/repository';
import { Aggregate } from '../core/domain/aggregate';

type IPrismaService = {
  $disconnect: () => Promise<any>;
};

export abstract class PrismaRepository<
  PrismaService extends IPrismaService,
  Domain extends Aggregate<any>,
  Persistence,
> extends RepositoryImplementation<any> {}
