import { Aggregate, model, Schema } from "mongoose";
import { IModel, IDocument, IUserObject, IUser } from "./types";
import { USERS_COLLECTION_NAME } from "./constants";

const { Types } = Schema;

const UserSchema = new Schema<IDocument, IModel>(
  {
    telegramId: {
      type: Types.String,
      required: true,
    },
    username: {
      type: Types.String,
    },
    isBlocked: {
      type: Types.Boolean,
      default: false,
    },
    createdAt: {
      type: Types.Date,
      default: Date.now,
    },
    updatedAt: {
      type: Types.Date,
      default: Date.now,
    },
  },
  {
    minimize: false,
  }
);

UserSchema.pre<IUserObject>("save", function () {
  this.updatedAt = new Date();
});

UserSchema.statics.createIfNotExists = async function (
  user: IUser
): Promise<IUserObject> {
  const existingUser = await Users.findOne({
    telegramId: user.telegramId,
  });
  if (existingUser) return existingUser;
  return new Users({
    telegramId: user.telegramId,
    username: user?.username,
  }).save();
};

UserSchema.statics.findAllTelegramIds = async function (): Promise<string[]> {
  const result = (await Users.find()).map((el) => {
    return el.telegramId;
  });
  return result;
};

export const Users = model<IDocument, IModel>(
  USERS_COLLECTION_NAME,
  UserSchema,
  USERS_COLLECTION_NAME
);
