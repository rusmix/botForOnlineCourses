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
  createIfNotExists(user: IMessage): Promise<IMessageObject>;
  findLastMessageTelegramId(): Promise<number>;
}

const UserSchema = new Schema<IDocument, IModel>(
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

UserSchema.pre<IMessageObject>("save", function () {
  this.updatedAt = new Date();
});

UserSchema.statics.findLastMessageTelegramId = async function (
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

export const Messages = model<IDocument, IModel>(
  "Messages",
  UserSchema,
  "Messages"
);
