const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const configs = require("../configs.js");
const Discord = require("discord.js");

module.exports = {
  name: "mesaj",
  description: "Bir mesaj gönderir.",
  type: 1,

  run: async (client, interaction, args) => {
    if (!configs.owners.includes(interaction.user.id)) {
      interaction.reply({
        content: `Bu komutu kullanma izniniz bulunmamaktadır.`,
        ephemeral: true,
      });
    } else {
      try {
        let embed = new EmbedBuilder()
          .setTitle("Click For Verify!")
          .setColor("000000")
          .setDescription(
            `**If you want to join the server, please verify yourself by clicking the button below. Don't forget, this is the FNAF server!**`,
          )
          .setImage(
            "https://image.api.playstation.com/vulcan/img/cfn/11307DoSLwchucsk9cIFbYAUkuJPuQv-VO-yZnBwENvMx2LIl8KhWu89t3V7zhDTFfE55wbSW5908XNkd_RJeNid8t4tbScw.png",
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("✅ Verify")
            .setStyle(ButtonStyle.Link)
            .setURL(`${configs.authLink}`),
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        interaction.reply({ content: "Mesaj gönderildi!", ephemeral: true });
      } catch (error) {
        console.error(error);
        interaction.reply({
          content: "Mesaj gönderilirken bir hata oluştu.",
          ephemeral: true,
        });
      }
    }
  },
};
