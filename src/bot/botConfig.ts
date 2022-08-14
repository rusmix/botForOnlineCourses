import { Telegraf } from "telegraf";
import "dotenv/config";
import { BotStrategies } from "./botStrategies";

export class BotConfig {
  private readonly telegramBot = new Telegraf(process.env.BOT_TOKEN);
  constructor() {
    this.InitializeStrategies();
    this.telegramBot.launch();
  }

  public InitializeStrategies() {
    new BotStrategies(
      this.telegramBot
    ).Initialize();
  }
}
