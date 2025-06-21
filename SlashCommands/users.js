const { EmbedBuilder } = require("discord.js");
const configs = require("../configs.js");
const { MongoClient } = require("mongodb");

module.exports = {
  name: "kullanıcılar",
  description: "Kullanıcıları Gösterir.",
  type: 1,

  run: async (client, interaction, args) => {
    if (!configs.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content: `Bu komutu kullanma izniniz bulunmamaktadır.`,
        ephemeral: true,
      });
    }

    const mongoClient = new MongoClient(configs.mongoUri, { useUnifiedTopology: true });

    try {
      await mongoClient.connect();
      const db = mongoClient.db();
      const usersCollection = db.collection("users"); 

      const users = await usersCollection.find({}).toArray();
      const userCount = users.length;

      const embed = new EmbedBuilder()
        .setTitle("OAUTH PANELİ")
        .setColor("000000")
        .setDescription(
          `● Botumuzda ${
            userCount !== 1
              ? `\`${userCount}\` kullanıcı`
              : `\`${userCount}\` kullanıcı bulunmaktadır`
          }\n● OAuth2 bağlantı bağlantınızı kontrol etmek için \`links\` komutunu kullanabilirsiniz.`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error("Kullanıcıları getirirken hata:", err);
      await interaction.reply({
        content: "Kullanıcılar veritabanı erişiminde bir hata oluştu.",
        ephemeral: true,
      });
    } finally {
      await mongoClient.close();
    }
  },
};
