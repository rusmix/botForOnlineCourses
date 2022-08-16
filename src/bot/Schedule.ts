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

export interface ISchedule {
  text: string[];
}

export interface IScheduleObject extends ISchedule {
  _id: Document["_id"];

  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends IScheduleObject, Document {
  _id: Document["_id"];
}

export interface IModel extends Model<IScheduleObject, IDocument> {
  createIfNotExists(tgId: string): Promise<IScheduleObject>;
}

const Schedule = new Schema<IDocument, IModel>(
  {
    text: {
      type: [Types.String],
      required: true,
    },
  },
  {
    minimize: false,
  }
);

Schedule.pre<IScheduleObject>("save", function () {
  this.updatedAt = new Date();
});

Schedule.statics.createIfNotExists = async function (
  tgId: string
): Promise<void> {
  const msg = await Schedules.findOne({ _id: tgId });
  if (msg) return;
  await new Schedules({ text: tgId }).save();
};

export const Schedules = model<IDocument, IModel>(
  "Schedule",
  Schedule,
  "Schedule"
);
