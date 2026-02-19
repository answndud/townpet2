declare module "resend" {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(input: {
        from: string;
        to: string | string[];
        subject: string;
        text?: string;
        html?: string;
      }): Promise<unknown>;
    };
  }
}
