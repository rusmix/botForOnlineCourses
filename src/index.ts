import { BotConfig } from "./bot/botConfig";
const mongoose = require('mongoose');
import 'dotenv/config';

const main = async () => {
  try {
    mongoose.connect(process.env.MONGO_URL);
  } catch (e) {
    console.log(e);
  }
  new BotConfig();
};

main();
