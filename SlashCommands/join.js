const { EmbedBuilder } = require("discord.js");
const Discord = require("discord.js");
const configs = require("../configs.js");
const User = require("../models/user.js");

module.exports = {
  name: "join",
  description: "Belirtilen miktarda kullanıcıyı sunucuya ekler!",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "miktar",
      description: "Eklemek istediğiniz kullanıcı sayısını girin",
      type: Discord.ApplicationCommandOptionType.Integer,
      required: true,
    },
  ],

  async run(client, interaction, args) {
    if (!configs.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content: `Bu komutu kullanma izniniz yok.`,
        ephemeral: true,
      });
    }

    let miktar = interaction.options.getInteger("miktar");

    if (miktar <= 0) {
      return interaction.reply("Lütfen geçerli bir miktar girin.");
    }

   
    let users;
    try {
      users = await User.find({}).limit(miktar);
    } catch (err) {
      console.error("MongoDB'den kullanıcılar çekilemedi:", err);
      return interaction.reply({
        content: "Kullanıcılar veritabanından çekilemedi.",
        ephemeral: true,
      });
    }

    if (!users || users.length === 0) {
      return interaction.reply({
        content: "Veritabanında eklenebilecek kullanıcı bulunamadı.",
        ephemeral: true,
      });
    }

    let addedUsers = 0;
    let errorCount = 0;
    let successCount = 0;
    let alreadyJoinedCount = 0;

    let embed = new EmbedBuilder()
      .setTitle("DASHBOARD")
      .setColor("#3498db")
      .setDescription(
        `\`⌛\`・Eklenen \`${addedUsers}\`/\`${miktar}\` Üye Sayısı...`,
      );

    let msg = await interaction.channel.send({ embeds: [embed] });

    await interaction.reply({
      content: "Sunucuya kullanıcı eklemek başlatıldı!",
      ephemeral: true,
    });

    for (const user of users) {
      const member = interaction.guild.members.cache.get(user.userID);

      if (member) {
        alreadyJoinedCount++;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));

        try {
          await interaction.guild.members.add(user.userID, {
            accessToken: user.access_token,
          });
          successCount++;
        } catch (err) {
          errorCount++;
        }

        addedUsers++;

        embed.setDescription(
          `\`⌛\`・Eklenen \`${addedUsers}\`/\`${miktar}\` Üye Sayısı...`,
        );
        await msg.edit({ embeds: [embed] });

        if (addedUsers === miktar) break;
      }
    }

    const finalEmbed = new EmbedBuilder()
      .setTitle("Kullanıcı Ekleme İşlemi Tamamlandı")
      .setColor("#2ecc71").setDescription(`
        Toplam Eklenen: ${addedUsers}/${miktar}
        Başarılı: ${successCount}
        Başarısız: ${errorCount}
        Zaten Katılmış: ${alreadyJoinedCount}
      `);

    await msg.edit({ embeds: [finalEmbed] });

    setTimeout(() => {
      msg.delete();
    }, 10000);
  },
};
