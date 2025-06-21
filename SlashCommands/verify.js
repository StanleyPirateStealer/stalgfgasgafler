const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  EmbedBuilder, 
  ButtonStyle, 
} = require("discord.js");
const { MongoClient } = require("mongodb");
const axios = require("axios");
const configs = require("../configs.js");

module.exports = {
  name: "verify",
  description: "Veritabanındaki tüm kullanıcıları doğrular",

  run: async (client, interaction, args) => {
    if (!configs.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content: `Bu komutu kullanma izniniz bulunmamaktadır.`,
        ephemeral: true,
      });
    }

    // Interaction'ı hemen defferla ki 3 saniyede zaman aşımı olmasın
    await interaction.deferReply({ ephemeral: true });

    const mongoClient = new MongoClient(configs.mongoUri, { useUnifiedTopology: true });
    try {
      await mongoClient.connect();
      const db = mongoClient.db();
      const usersCollection = db.collection("users");

      const allUsers = await usersCollection.find({}).toArray();
      const totalUsers = allUsers.length;

      let validUsers = [];
      let invalidCount = 0;
      let checkingCount = 0;

      let embed1 = new EmbedBuilder()
        .setTitle("DURUM PANELİ")
        .setColor("000000")
        .setDescription(
          `\`⌛\`・Kullanıcılar doğrulanıyor \`${checkingCount}\`/\`${totalUsers}\`...`
        );

      // Kanal mesajı gönder
      const msg = await interaction.channel.send({ embeds: [embed1] });

      // Defer sonrası cevap olarak mesajı güncelle
      await interaction.editReply({
        content: "Kullanıcı doğrulama işlemi başlatıldı!",
      });

      for (const user of allUsers) {
        if (user.access_token && user.access_token !== "") {
          await new Promise((r) => setTimeout(r, 500));
          try {
            const response = await axios.get(
              "https://discord.com/api/v10/users/@me",
              { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            if (response.status === 200) {
              validUsers.push(user);
            }
          } catch (err) {
            const status = err?.response?.status;
            if (status === 403 || status === 401) {
              invalidCount++;
            } else if (status === 401) {
              // Eğer erişim token geçersizse refresh token deneyebilirsin
              try {
                const refreshResponse = await axios.post(
                  "https://discord.com/api/v10/oauth2/token",
                  null,
                  { headers: { Authorization: `Bearer ${user.refresh_token}` } }
                );
                if (refreshResponse.status === 200) {
                  validUsers.push(user);
                }
              } catch (refreshErr) {
                const rStatus = refreshErr?.response?.status;
                if (rStatus === 403 || rStatus === 401) {
                  invalidCount++;
                }
              }
            }
          }
        }
        checkingCount++;

        if (checkingCount % 10 === 0 || checkingCount === totalUsers) {
          embed1.setDescription(
            `\`⌛\`・Kullanıcılar doğrulanıyor \`${checkingCount}\`/\`${totalUsers}\`...`
          );
          await msg.edit({ embeds: [embed1] });
        }
      }

      let embed2 = new EmbedBuilder()
        .setTitle("DURUM PANELİ")
        .setColor("000000")
        .setDescription(`
\`🟢\`・Geçerli: \`${validUsers.length}\`
\`🔴\`・Geçersiz: \`${invalidCount}\`

・Geçerli kullanıcıları veritabanına eklemek için Evet butonuna basın.
        `);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Evet")
          .setCustomId("yes")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setLabel("Hayır")
          .setCustomId("no")
          .setStyle(ButtonStyle.Danger)
      );

      await msg.edit({ embeds: [embed2], components: [row] });

      const filter = (i) => i.user.id === interaction.user.id && (i.customId === "yes" || i.customId === "no");
      const collector = msg.createMessageComponentCollector({ filter, max: 1, time: 60000 });

      collector.on("collect", async (i) => {
        if (i.customId === "yes") {
          const validCollection = db.collection("validUsers");
          await validCollection.deleteMany({});
          if (validUsers.length > 0) {
            await validCollection.insertMany(validUsers);
          }
          await i.reply({ content: "[BOT] Geçerli kullanıcılar veritabanına aktarıldı!", ephemeral: true });
          await msg.delete().catch(() => {});
        } else if (i.customId === "no") {
          await i.reply({ content: "İşlem iptal edildi.", ephemeral: true });
          await msg.delete().catch(() => {});
        }
        collector.stop();
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time") {
          msg.delete().catch(() => {});
        }
      });

    } catch (error) {
      console.error("Verify komutu hata:", error);
      // Eğer interaction daha önce defer edilmişse followUp kullan, edilmediyse reply
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "Bir hata oluştu.", ephemeral: true });
      } else {
        await interaction.reply({ content: "Bir hata oluştu.", ephemeral: true });
      }
    } finally {
      await mongoClient.close();
    }
  },
};
