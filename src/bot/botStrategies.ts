import { Telegraf, Context, Types, Markup } from "telegraf";
import "dotenv/config";
import { Users } from "../instances/user/model";
import { Update, Message, User } from "typegram";
import { Config as config } from "./config";
import { Messages } from "./Message";
import { createTextChangeRange } from "typescript";

type BaseMessage = Update.New &
  Update.NonChannel &
  Message & {
    text?: string;
    forward_from?: User;
    voice?: unknown;
    sticker?: unknown;
    document?: unknown;
    photo?: unknown[];
    caption: string;
  };

type TgMessage = BaseMessage & {
  reply_to_message?: BaseMessage;
};

type TgAsset = {
  file_id: string;
};

export class BotStrategies {
  constructor(private readonly bot: Telegraf<Context>) {}

  Initialize() {
    this.bot.start((ctx: Context) => this.start(ctx));

    this.bot.hears(/\/help/, (ctx: Context) => this.getHelp(ctx));

    this.bot.hears(/\/call/, (ctx: Context) => this.getCall(ctx));

    this.bot.hears(/\/homework/, (ctx: Context) => this.getHomework(ctx));

    this.bot.hears(/\/timetable/, (ctx: Context) => this.getTimetable(ctx));

    // this.bot.hears(/\/menu/, (ctx: Context) => this.menu(ctx));

    this.bot.on("message", (ctx: Context) => this.handleMessage(ctx));

    console.log("BotStrategies initialization ended.");
  }

  private async getHelp(ctx: Context) {
    try {
      ctx.deleteMessage();
      console.log("gethelp");
      const userId = ctx.message.from.id;
      this.bot.telegram.sendMessage(
        userId,
        "Don’t panic!\n\nЕсли нужно посмотреть расписание, команда /timetable\nПоследнее задание - /homework\nЗапросить звонок с Полиной - /call\n\nДля того, чтобы сдать домашнее задание - просто отправьте его в чат\n\nЕсть вопросы? - пишите сюда же, бот приведёт помощь)"
      );
    } catch (e) {
      console.log(e);
      ctx.reply("Unknown error accured: ", e.message);
    }
  }

  private async getTimetable(ctx: Context) {
    try {
      console.log("timetable");
      console.log(ctx);
      const userId = ctx.message.from.id;
      this.bot.telegram.sendMessage(
        userId,
        "Расписание:\n17.08 - Zoom в 19:00 по Мск\n18.08 - Письменная активность 1\n20.08 - Письменная активность 2\n22.08 - Письменная активность 3\n24.08 - Zoom в 19:00 по Мск"
      );
      ctx.deleteMessage();
    } catch (e) {
      console.log(e);
      ctx.reply("Unknown error accured: ", e.message);
    }
  }

  // private async menu(ctx: Context) {
  //   ctx.deleteMessage();
  //   const keyboard = Markup.inlineKeyboard([
  //     Markup.button.callback("    Call   ", "getcall"),
  //     Markup.button.callback("   Timetable     ", "timetable"),
  //     Markup.button.callback("   Homework     ", "homework"),
  //   ]);
  //   ctx.reply("Hello", keyboard);
  //   this.bot.action("getcall", (ctx: Context) => this.getCall(ctx));
  //   this.bot.action("timetable", (ctx: Context) => this.getTimetable(ctx));
  //   this.bot.action("homework", (ctx: Context) => this.getHomework(ctx));
  // }

  private async getCall(ctx: Context) {
    const userId = ctx.message.from.id;
    this.bot.telegram.sendMessage(userId, "Ищем время для звонка!");
    await this.bot.telegram.sendMessage(
      config.adminId,
      "Кто-то хочет связаться:"
    );
    ctx.forwardMessage(config.adminId);
  }

  private async getHomework(ctx: Context) {
    const msgId = await Messages.findLastMessageTelegramId();
    const userId = ctx.message.from.id;
    if (!msgId) {
      this.bot.telegram.sendMessage(userId, "ДЗ пока нет.");
      return;
    }
    await this.bot.telegram.sendMessage(userId, "Вот последнее ДЗ:");
    this.bot.telegram.copyMessage(userId, config.adminId, msgId);
    ctx.deleteMessage();
  }

  private async start(ctx: Context) {
    try {
      const userId = ctx.message.from.id;
      this.bot.telegram.sendMessage(
        userId,
        "Добро пожаловать на онлайн курс!\nЧтобы отправить домашнее задание на проверку - просто отправьте его в этот чат!"
      );
      if (String(userId) == config.adminId) return;
      await Users.createIfNotExists({
        telegramId: userId as unknown as string,
        username: ctx.message.from?.username,
        isBlocked: false,
      });
    } catch (e) {
      console.log(e);
      ctx.reply("Unknown error accured: ", e.message);
    }
  }

  private async handleMessage(ctx: Context) {
    try {
      console.log(ctx.message);
      if (String(ctx.message.from.id) == config.adminId)
        return this.handleMessageFromAdmin(ctx);
      return this.handleMessageFromUser(ctx);
    } catch (e) {
      console.log(e);
      ctx.reply("Unknown error accured: ", e.message);
    }
  }
  private async handleMessageFromAdmin(ctx: Context) {
    const message = ctx.message as TgMessage;
    if (message.reply_to_message) {
      if (message?.text.split(" ")[0] == "/timeForCall")
        return this.replyAndGiveSchedule(ctx);
      return this.replyAndHelp(ctx);
    }
    return this.sendMessageToAll(ctx);
  }

  private async sendMessageToAll(ctx: Context) {
    const message = ctx.message as TgMessage;
    const usersIds = await Users.findAllTelegramIds();
    await new Messages({ telegramId: message.message_id }).save();
    usersIds.forEach((id) => {
      this.bot.telegram.copyMessage(id, config.adminId, message.message_id);
      // this.sendAnyDocument(id, ctx);
    });
  }

  private async sendAnyDocument(userId: string, ctx: Context) {
    const message = ctx.message as TgMessage;
    const [text, file_id] = [
      message.text || message.caption,
      (
        ((message.photo ? message.photo.slice(-1)[0] : false) ||
          message.document ||
          message.sticker ||
          message.voice) as TgAsset
      )?.file_id,
    ];
    if (text) await this.bot.telegram.sendMessage(userId, text);
    if (file_id) {
      try {
        await this.bot.telegram.sendPhoto(userId, file_id);
      } catch {
        await this.bot.telegram.sendDocument(userId, file_id);
      }
    }
  }

  private async replyAndGiveSchedule(ctx: Context) {
    const message = ctx.message as TgMessage;
    const availableTime = message?.text.replace("/settime", "");
    const userId = String(message.reply_to_message.forward_from?.id);
    this.bot.telegram.sendMessage(
      userId,
      `Доступное время для звонка: ${availableTime}\nНапишите, во сколько Вам было бы удобно созвониться, и в назначенное время наберите Полину: t.me/pollebedeva`
    );
  }

  private async replyAndHelp(ctx: Context) {
    const message = ctx.message as TgMessage;
    if (message?.text[0] == "/") return;
    if (String(message.from.id) == config.adminId) return;

    const userId = String(message.reply_to_message.forward_from?.id);

    this.sendAnyDocument(userId, ctx);
  }

  private async handleMessageFromUser(ctx: Context) {
    if ((ctx as any).message?.text[0] == "/") return;
    return ctx.forwardMessage(config.adminId);
  }
}
