import "dotenv/config";
export class Config {
    public static adminId: string = process.env.ADMIN_ID as string
  }