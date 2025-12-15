export class NamingManager {
  constructor(
    private readonly org: string,
    private readonly system: string,
    private readonly service: string
  ) {}

  /**
   * 命名規則: <Org>-<System>-<Service>-<component>-<detail>
   * 例: ACME-OrderSys-Api-lambda-createOrder
   */
  public generate(component: string, detail: string): string {
    return `${this.org}-${this.system}-${this.service}-${component}-${detail}`;
  }

  public get orgName() { return this.org; }
  public get systemName() { return this.system; }
  public get serviceName() { return this.service; }
}