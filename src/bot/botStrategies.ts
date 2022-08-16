import { Telegraf, Context, Types, Markup } from "telegraf";
import "dotenv/config";
import { Users } from "../instances/user/model";
import { Update, Message, User } from "typegram";
import { Config as config } from "./config";
import { Messages } from "./Message";
import { convertToObject, createTextChangeRange } from "typescript";
import { error } from "console";
import { Schedules } from "./Schedule";
const fs = require("fs");
const path = require("path");

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

    this.mongoSchedule();

    this.bot.hears(/\/help/, (ctx: Context) => this.getHelp(ctx));

    this.bot.hears(/\/clients/, (ctx: Context) => this.getClients(ctx));

    this.bot.hears(/\/sendhomework/, (ctx: Context) => this.sendHomework(ctx));

    this.bot.hears(/\/call/, (ctx: Context) => this.getCall(ctx));

    this.bot.hears(/\/homework/, (ctx: Context) => this.getHomework(ctx));

    this.bot.hears(/\/timetable/, (ctx: Context) => this.getTimetable(ctx));

    this.bot.hears(/\/sched/, (ctx: Context) => this.editSchedule(ctx));

    this.bot.on("message", (ctx: Context) => this.handleMessage(ctx));

    console.log("BotStrategies initialization ended.");
  }

  private async broadcast(ctx: Context) {
    const message = ctx.message as TgMessage;
    if (message.from.id !== Number(config.adminId)) return;
    console.log(message.text);
    try {
      // await Users.remove();
      const res = await Users.findAllTelegramIds();
      if (res.length === 0) {
        await this.bot.telegram.sendMessage(
          config.adminId,
          "Никто Вас не слышит."
        );
        return;
      }
      console.log(res);
      let text = undefined;

      if ("text" in message) {
        text = message.text.replace("/broadcast", "\n");
      } else text = message.caption.replace("/broadcast", "\n");

      // text =
      //   message.text.replace("/broadcast", "") ||
      //   message.caption.replace("/broadcast", "");
      for (var i = 0; i < res.length; i++) {
        const msg = await this.bot.telegram.copyMessage(
          res[i],
          config.adminId,
          message.message_id
        );
        console.log(msg);
        if ("text" in message) {
          text = message.text.replace("/broadcast", "\n");
          await this.bot.telegram.editMessageText(
            res[i],
            msg.message_id,
            undefined,
            text
          );
        } else {
          text = message.caption.replace("/broadcast", "\n");
          await this.bot.telegram.editMessageCaption(
            res[i],
            msg.message_id,
            undefined,
            text
          );
        }
      }
      // await this.bot.telegram.copyMessage(userId, config.adminId, msgId);
    } catch (e) {
      this.errorHandler(e, config.adminId);
      console.log(e);
    }
  }

  private async sendHomework(ctx: Context) {
    const message = ctx.message as TgMessage;
    try {
      const userId = message.from.id;
      ctx.deleteMessage();
      await this.bot.telegram.sendMessage(
        userId,
        "Отправьте домашнее задание ответным сообщением или вложенным файлом. Не используйте голосовые сообщения. Постарайтесь уложиться в одно сообщение, так удобнее проверять 😉"
      );
    } catch (e) {
      console.log(e);
    }
  }

  private async editSchedule(ctx: Context) {
    const message = ctx.message as TgMessage;
    if (message.from.id !== Number(config.adminId)) return;
    try {
      const res = await Schedules.findOne();
      // console.log(res.id);
      const text = res.text;
      const command = message.text.split(" ")[1];
      const data = message.text.split(" ").slice(2).join(" ");
      console.log("DATA:", data);
      // this.bot.telegram.sendMessage(
      //   config.adminId,
      //   `Текущий текст:\n${text.join("")}`
      // );
      if (command === "+") {
        text.push(data + "\n");
        console.log(text);
        await Schedules.updateOne({ _id: res.id }, { $set: { text: text } });
      }
      if (!isNaN(Number(command))) {
        const index = Number(command) - 1;
        if (data === "") {
          // console.log("AAA_____________")
          text.splice(index, 1);
        } else {
          text.splice(index, 1, data + "\n");
        }
        console.log(text);
        await Schedules.updateOne({ _id: res.id }, { $set: { text: text } });
      }
      this.bot.telegram.sendMessage(
        config.adminId,
        "Расписание успешно изменено"
      );
    } catch (e) {
      console.log(e);
    }
  }

  private async getHelpForAdmin(ctx: Context) {
    try {
      await this.bot.telegram.sendMessage(
        config.adminId,
        "Это помощь для администратора:\n\n" +
          "Если нужно задать дз, просто отправьте его в чат в любом виде, но обязательно одним сообщением. Внимание: если задать новое дз, старое будет недоступно для получения учениками.\n\n" +
          "Чтобы проверить домашку, просто ответьте на сообщение ученика. Соответственно так можно и просто общаться с учеником.\n\n" +
          "Для того, чтобы уведомить всех о новом дз или просто написать какую-то новость, используйте команду /broadcast <какой-то текст> <фото или видео или документ, если нужно>\n\n" +
          "Администратор может редактировать расписание (пишем всё через пробел):\n" +
          "/sched + <текст>   - добавляет новый пункт\n" +
          "/sched 12          - удаляет пункт\n" +
          "/sched 12 <текст>  - заменяет пункт расписания\n\n" +
          "Вывести список всех пользователей - команда /clients\n\n"
      );
    } catch (e) {
      console.log(e);
    }
  }

  private async getHelp(ctx: Context) {
    try {
      await ctx.deleteMessage();
      const userId = ctx.message.from.id;
      if (userId === Number(config.adminId)) return this.getHelpForAdmin(ctx);
      await this.bot.telegram.sendMessage(
        userId,
        "Don’t panic! \n\nЕсли нужно посмотреть расписание, команда /timetable\nПоследнее задание - /homework\nЗапросить звонок с Полиной - /call\n\nДля того, чтобы сдать домашнее задание - просто отправьте его в чат\n\nЕсть вопросы? - пишите сюда же, бот приведёт помощь)"
      );
    } catch (e) {
      console.log(e);
      ctx.reply("Unknown error accured: ", e.message);
    }
  }
  private async getClients(ctx: Context) {
    const message = ctx.message as TgMessage;
    if (message.from.id !== Number(config.adminId)) return;
    try {
      const res = await Users.find();
      let clients = [];
      for (let i = 0; i < res.length; i++) {
        clients.push({
          username: res[i].username,
          telegramId: res[i].telegramId,
        });
      }
      let text = "Вот список пользователей:\n\n";
      for (let i = 0; i < res.length; i++) {
        if (clients[i].username === undefined)
          text =
            text +
            (i + 1) +
            ") Ссылка отсутствует.\nТелеграм ID: " +
            clients[i].telegramId +
            "\n\n";
        else
          text =
            text +
            (i + 1) +
            ") Ссылка: t.me/" +
            clients[i].username +
            "\nТелеграм ID: " +
            clients[i].telegramId +
            "\n\n";
      }
      // console.log(text);
      // console.log(clients);
      await this.bot.telegram.sendMessage(config.adminId, text);
    } catch (e) {
      console.log(e);
    }
  }
  private async getTimetable(ctx: Context) {
    const userId = ctx.message.from.id;
    try {
      console.log("timetable");
      console.log(ctx);
      if (Number(config.adminId) === userId) {
        await this.getTimetableAdmin(ctx);
        return;
      }
      const res = await Schedules.findOne();
      const text = res.text;
      await this.bot.telegram.sendMessage(
        userId,
        `Расписание:\n${text.join("")}`
      );
      await ctx.deleteMessage();
    } catch (e) {
      console.log(e);
      // ctx.reply("Unknown error accured: ", e.message);
    }
  }

  private async getTimetableAdmin(ctx: Context) {
    const userId = ctx.message.from.id;
    try {
      const res = await Schedules.findOne();
      let text = res.text;
      console.log(text);
      let newText = [];
      for (let i = 0; i < text.length; i++) {
        newText.push(`${i + 1}) ` + text[i]);
      }
      console.log(text);
      const msg = await this.bot.telegram.sendMessage(
        config.adminId,
        `Расписание:\n${newText.join("")}`
      );
      console.log(msg);
      await ctx.deleteMessage();
    } catch (e) {
      console.log(e);
    }
  }

  private async getCall(ctx: Context) {
    try {
      const userId = ctx.message.from.id;
      await this.bot.telegram.sendMessage(userId, "Ищем время для звонка!");
      await this.bot.telegram.sendMessage(
        config.adminId,
        "Кто-то хочет связаться, ответьте в формате 16.08 14:00 15:20_17.08 19:00_19.08 12:10"
      );
      await ctx.forwardMessage(config.adminId);
    } catch (e) {
      console.log(e);
    }
  }

  private async getHomework(ctx: Context) {
    try {
      const msgId = await Messages.findLastMessageTelegramId();
      const userId = ctx.message.from.id;
      if (!msgId) {
        await this.bot.telegram.sendMessage(userId, "ДЗ пока нет.");
        await ctx.deleteMessage();
        return;
      }
      await this.bot.telegram.sendMessage(userId, "Вот последнее ДЗ:");
      await this.bot.telegram.copyMessage(userId, config.adminId, msgId);
      await ctx.deleteMessage();
    } catch (e) {
      console.log(e);
    }
  }

  private async start(ctx: Context) {
    try {
      const message = ctx.message as TgMessage;
      const userId = message.from.id;
      await this.bot.telegram.sendMessage(
        userId,
        "Добро пожаловать на онлайн курс!\nЧтобы отправить домашнее задание на проверку - просто отправьте его в этот чат!"
      );
      if (String(userId) == config.adminId) return;
      await Users.createIfNotExists({
        telegramId: userId as unknown as string,
        username: message.from?.username,
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
    try {
      const message = ctx.message as any; //TgMessage;
      if (message.reply_to_message) {
        if ("text" in message.reply_to_message)
          if (message?.reply_to_message.text.split(" ")[0] == "/call")
            return this.replyAndGiveSchedule(ctx);
        return this.replyAndHelp(ctx);
      }
      if ("text" in message && message.text.split(" ")[0] == "/broadcast")
        return this.broadcast(ctx);
      if ("caption" in message && message.caption.split(" ")[0] == "/broadcast")
        return this.broadcast(ctx);
      return this.setHomework(ctx);
    } catch (e) {
      console.log(e);
    }
  }

  private async setHomework(ctx: Context) {
    try {
      const message = ctx.message as TgMessage;
      if ("text" in message && message.text[0] == "/") return;
      await Messages.createIfNotExists(message.message_id as unknown as string);
    } catch (e) {
      console.log(e);
    }
  }

  private async replyAndGiveSchedule(ctx: Context) {
    const message = ctx.message as TgMessage;
    try {
      const availableTime = message?.text.replace("_", "\n");
      const userId = String(message.reply_to_message.forward_from?.id);
      await this.bot.telegram.sendMessage(
        userId,
        `Доступное время для звонка:\n${availableTime}\nНапишите здесь, во сколько Вам было бы удобно созвониться, и в назначенное время наберите Полину: t.me/pollebedeva`
      );
    } catch (e) {
      this.errorHandler(e, config.adminId);
    }
  }
  //451612433
  private async replyAndHelp(ctx: Context) {
    const message = ctx.message as TgMessage;
    try {
      if ("text" in message) {
        if (message.text[0] == "/") return;
      }
      if (String(message.from.id) != config.adminId) return;

      const userId = message.reply_to_message.forward_from?.id;

      await this.bot.telegram.copyMessage(
        userId,
        config.adminId,
        message.message_id
      );
    } catch (e) {
      // console.log("______catch______");
      console.log(e);
      this.errorHandler(e, config.adminId);
    }
  }

  private async errorHandler(e, userId) {
    try {
      console.log(e);
      if (e.response.error_code == 403) {
        await Users.deleteOne({ telegramId: e.on.payload.chat_id });
        await this.bot.telegram.sendMessage(
          config.adminId,
          "Сообщение не доставлено, один или несколько пользователей заблокировал бота. Записи в базе данных были отредактированы."
        );
      } else
        await this.bot.telegram.sendMessage(
          config.adminId,
          "Сообщение не доставлено, что-то пошло не так."
        );
    } catch (e) {
      console.log(e);
    }
  }

  private async handleMessageFromUser(ctx: Context) {
    const message = ctx.message as TgMessage;
    try {
      if ("text" in message) if (message.text[0] == "/") return;
      return ctx.forwardMessage(config.adminId);
    } catch (e) {
      console.log(e);
      this.errorHandler(e, message.from.id);
    }
  }

  private async mongoSchedule() {
    try {
      // await Messages.remove();
      // await Users.remove();
      // await Schedules.remove();
      const res = await Schedules.find();
      // console.log(res[0].text);
      // console.log(res);
      if (res.length === 0) {
        console.log("empty, creating sample object");
        await new Schedules({
          text: [
            "17.08 - Zoom в 19:00 по Мск\n",
            "18.08 - Письменная активность 1\n",
            "20.08 - Письменная активность 2\n",
            "22.08 - Письменная активность 3\n",
            "18.08 - Письменная активность 1\n",
            "24.08 - Zoom в 19:00 по Мск\n",
          ],
        }).save();
        // console.log(res);
      }
    } catch (e) {
      console.log(e);
    }
  }
}
