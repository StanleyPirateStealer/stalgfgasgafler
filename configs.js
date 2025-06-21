require('dotenv').config();

module.exports = {
  token: process.env.TOKEN,
  port: process.env.PORT || 80,
  prefix: process.env.PREFIX || ".",
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uri: process.env.REDIRECT_URI,
  idserver: process.env.IDSERVER,
  idrole: process.env.IDROLE,
  webhook: process.env.WEBHOOK,
  webhookBackup: process.env.WEBHOOK_BACKUP,
  authLink: process.env.AUTH_LINK,
  owners: process.env.OWNERS ? process.env.OWNERS.split(",").filter(Boolean) : [],
  mongoUri: process.env.MONGO_URI 
};
