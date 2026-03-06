import  GuildClient  from '@citadel-guilds/sdk';

const guild = new GuildClient({
  name: 'writers',
  natsPrefix: 'citadel.writer',
  port: 8200,
});

guild.start();
