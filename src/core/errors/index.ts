export class HttpError {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly metadata?: any,
  ) {}
}

export class RepositoryError {
  constructor(
    public readonly message: string,
    public readonly metadata?: any,
  ) {}
}

export class ConflictException extends Error {
  public status = 409;
}

export class UnauthorizedException extends Error {
  public status = 401;
  public metadata;
  constructor(message?: string, metadata?: any) {
    super(message);
    this.metadata = metadata;
  }
}

export class ForbiddenException extends Error {
  public status = 403;
  public metadata;
  constructor(message?: string, metadata?: any) {
    super(message);

    this.metadata = metadata;
  }
}

export class ItemNotFound extends Error {
  public status = 454;
  public metadata;
  constructor(aggregate: string, id: string, metadata?: any) {
    super(`Item não encontrado (${aggregate}). ID de referência: ${id}.`);
    this.metadata = metadata;
  }
}

export class BadRequestException extends Error {
  public status = 451;
  public metadata;
  constructor(message?: string, metadata?: any) {
    super(message);
    this.metadata = metadata;
  }
}

export class ApplicationLevelError extends Error {
  public status = 400;
  public metadata;

  constructor(message: string, metadata?: any) {
    super(message);
    this.metadata = metadata;
  }
}

export class DomainError extends Error {
  public status = 422;
  public metadata;

  constructor(message: string, metadata?: any) {
    super(message);
    this.metadata = metadata;
  }
}

export class MethodNotAllowedException extends Error {
  public status = 500;
  constructor(message?: string) {
    super(message ?? 'Método não permitido. Contate um administrador');
  }
}

export class NotImplementedException extends Error {
  public status = 500;
}
