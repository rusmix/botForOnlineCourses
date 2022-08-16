import { ObjectId } from "mongodb";
import { Aggregate, Document, Model } from "mongoose";

export interface IUser {
  telegramId: string;
  username: string;
  first_name: string;
  last_name: string;
  isBlocked: boolean;
}

export interface IUserObject extends IUser {
  _id: Document["_id"];

  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends IUserObject, Document {
    _id: Document["_id"];
}

export interface IModel extends Model<IUserObject, IDocument> {
    createIfNotExists(user: IUser): Promise<IUserObject>;
    findAllTelegramIds(): Promise<string[]>;
}


