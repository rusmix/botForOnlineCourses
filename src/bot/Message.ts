import { ObjectId } from "mongodb";
import {
  Aggregate,
  Document,
  Model,
  model,
  modelNames,
  Schema,
} from "mongoose";

const { Types } = Schema;

export interface IMessage {
  telegramId: string;
}

export interface IMessageObject extends IMessage {
  _id: Document["_id"];

  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends IMessageObject, Document {
  _id: Document["_id"];
}

export interface IModel extends Model<IMessageObject, IDocument> {
  createIfNotExists(tgId: string): Promise<IMessageObject>;
  findLastMessageTelegramId(): Promise<number>;
}

const Message = new Schema<IDocument, IModel>(
  {
    telegramId: {
      type: Types.String,
      required: true,
    },
  },
  {
    minimize: false,
  }
);

Message.pre<IMessageObject>("save", function () {
  this.updatedAt = new Date();
});

Message.statics.findLastMessageTelegramId = async function (
  msg: IMessage
): Promise<number> {
  try {
    const result = (await Messages.find()).map((el) => {
      return el.telegramId;
    });
    return Number(result.splice(-1, 1));
  } catch (err) {
    return undefined;
  }
};
Message.statics.createIfNotExists = async function (
    tgId: string
  ): Promise<void> {
    const msg =await Messages.findOne({telegramId: tgId});
    if (msg) return;
    await new Messages({ telegramId: tgId }).save();
  }
export const Messages = model<IDocument, IModel>(
  "Messages",
   Message,
  "Messages"
);
