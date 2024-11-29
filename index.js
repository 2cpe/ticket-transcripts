require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const config = {
    token: process.env.BOT_TOKEN,
    adminRole: process.env.ADMIN_ROLE,
    ticketCategory: process.env.TICKET_CATEGORY,
    logsChannel: process.env.LOGS_CHANNEL,
    ticketCloseLogs: process.env.TICKET_CLOSE_LOGS
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Command to create the ticket panel
client.on('messageCreate', async (message) => {
    if (message.content === '!createticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setDescription(`
            ### Need Assistance? 🎫
            > Click the button below to create a ticket
            > Our support team is here to help you
            
            *We aim to respond as quickly as possible*`)
            .setColor('#2b2d31')
            .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Create Ticket')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Secondary)
            );

        await message.channel.send({ 
            embeds: [embed], 
            components: [row] 
        });
    }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const ticketChannel = await createTicket(interaction);
        if (ticketChannel) {
            await interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`
                        ### Ticket Created Successfully! 🎫
                        > Your ticket has been created at ${ticketChannel}
                        > Our support team will assist you shortly
                        
                        *Please be patient while we review your ticket*`)
                        .setColor('#2b2d31')
                        .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&')
                        .setTimestamp()
                ],
                ephemeral: true 
            });
        }
    }

    if (interaction.customId === 'close_ticket') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member.roles.cache.has(config.adminRole)) {
            return interaction.reply({ content: 'Only administrators can close tickets!', ephemeral: true });
        }
        await closeTicket(interaction);
    }
});

async function createTicket(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;

    // Check if user already has an open ticket
    const existingTicket = guild.channels.cache.find(
        channel => channel.name === `ticket-${user.username.toLowerCase()}`
    );

    if (existingTicket) {
        await interaction.reply({ 
            embeds: [
                new EmbedBuilder()
                    .setDescription(`
                    ### You Already Have an Open Ticket! ⚠️
                    > Please use your existing ticket: ${existingTicket}
                    > Close your current ticket before creating a new one
                    
                    *If you're having issues, contact an administrator*`)
                    .setColor('#ff0000')
                    .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&')
                    .setTimestamp()
            ],
            ephemeral: true 
        });
        return null;
    }

    // Create the ticket channel if no existing ticket found
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategory,
        topic: `Ticket Creator ID: ${user.id}`,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
                id: config.adminRole,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
        ],
    });

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Ticket Support',
            iconURL: 'https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&'
        })
        .setDescription(`
        ### Welcome to your ticket! 👋
        > Ticket created by: ${user}
        > Please describe your issue
        
        *A staff member will assist you shortly*`)
        .setColor('#2b2d31')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

    await ticketChannel.send({ embeds: [embed], components: [row] });

    // Send and delete admin mention
    const mentionMessage = await ticketChannel.send(`<@&${config.adminRole}>`);
    setTimeout(() => {
        mentionMessage.delete().catch(console.error);
    }, 1000); // Delete after 1 second

    return ticketChannel;
}

// Add this function at the top level of your code to generate a unique ID
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15);
}

// Update the closeTicket function
async function closeTicket(interaction) {
    try {
        // Defer the reply immediately
        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.channel;
        
        // Get user ID from channel topic
        const topic = channel.topic;
        if (!topic) {
            await interaction.editReply({ content: 'Could not find ticket information.' });
            return;
        }

        // Extract user ID from topic
        const userId = topic.split(': ')[1];
        if (!userId) {
            await interaction.editReply({ content: 'Could not find the ticket creator.' });
            return;
        }

        try {
            const user = await client.users.fetch(userId);
            if (!user) {
                await interaction.editReply({ content: 'Could not find the ticket creator.' });
                return;
            }

            // Generate transcript and other operations...
            const messages = await channel.messages.fetch();
            const transcriptId = generateUniqueId();
            
            // Add this code for transcript generation
            const transcriptData = {
                id: transcriptId,
                title: channel.name,
                messages: messages.reverse().map(msg => ({
                    author: msg.author.tag,
                    authorAvatar: msg.author.displayAvatarURL({ dynamic: true }),
                    content: msg.content,
                    timestamp: msg.createdAt.toLocaleString()
                }))
            };

            // Save transcript to GitHub
            await saveTranscript(transcriptData);

            // Send transcript link to user
            const transcriptEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Ticket Transcript',
                    iconURL: 'https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png'
                })
                .setDescription(`
                ### 📝 Ticket Transcript Ready
                > **Ticket:** \`${channel.name}\`
                > Click the button below to view the transcript
                
                *This transcript will be available for 24 hours*`)
                .setColor('#2b2d31')
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Transcript')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://2cpe.github.io/ticket-transcripts/?id=${transcriptId}&userId=${userId}&creator=${userId}`)
                        .setEmoji('📄')
                );

            // Send transcript embed to user
            await user.send({
                embeds: [transcriptEmbed],
                components: [row]
            });

            // In the closeTicket function, after sending the transcript
            // Add rating request
            const ratingEmbed = new EmbedBuilder()
                .setTitle('Ticket Rating')
                .setDescription('Please rate your experience (1-5)')
                .setColor('#ffff00');

            const ratingRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rate_1')
                        .setLabel('1')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('rate_2')
                        .setLabel('2')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('rate_3')
                        .setLabel('3')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('rate_4')
                        .setLabel('4')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('rate_5')
                        .setLabel('5')
                        .setEmoji('⭐')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Send rating request to user
            await user.send({ 
                embeds: [ratingEmbed], 
                components: [ratingRow] 
            });

            // Send close notification to logs channel
            const closeLogsChannel = await client.channels.fetch(config.ticketCloseLogs);
            const ticketCloseEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Ticket Closed',
                })
                .setDescription(`
                ### 🎫 Ticket Details
                > **Channel:** \`${channel.name}\`
                > **Status:** Closed
                > **Action by:** ${interaction.user}
                > **User:** ${user}
                > **Date:** <t:${Math.floor(Date.now() / 1000)}:F>
                
                *Transcript has been sent to the user*`)
                .setColor('#2b2d31')
                .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
                .setTimestamp();

            await closeLogsChannel.send({
                embeds: [ticketCloseEmbed]
            });

            // Update interaction with success message
            await interaction.editReply({ content: 'Ticket closed successfully!' });

            // Delete the channel after a short delay
            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error('Error deleting channel:', error);
                }
            }, 1000);

        } catch (error) {
            console.error('Error in ticket closure:', error);
            await interaction.editReply({ 
                content: 'An error occurred while closing the ticket. Please try again.' 
            });
        }

    } catch (error) {
        console.error('Error in closeTicket:', error);
        // Only try to reply if the interaction hasn't been handled
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: 'An error occurred while processing the ticket closure.', 
                    ephemeral: true 
                });
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    }
}

// Update the rating buttons handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('rate_')) return;

    const rating = interaction.customId.split('_')[1];

    // Create modal for feedback
    const modal = new ModalBuilder()
        .setCustomId(`feedback_${rating}`)
        .setTitle(`Rating: ${rating}/5 - Feedback`);

    // Add text input to modal
    const feedbackInput = new TextInputBuilder()
        .setCustomId('feedback_text')
        .setLabel('Please provide your feedback')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell us about your experience...')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1000);

    const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
});

// Handle modal submit
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('feedback_')) return;

    const rating = interaction.customId.split('_')[1];
    const feedback = interaction.fields.getTextInputValue('feedback_text');
    const logsChannel = await client.channels.fetch(config.logsChannel);

    // Get star emojis based on rating
    const stars = '⭐'.repeat(parseInt(rating));
    
    // Choose image URL based on rating
    let imageUrl;
    if (rating >= 4) {
        imageUrl = 'https://cdn.discordapp.com/attachments/1288807959685758987/1311791527533740124/RaZo_Thank_u.png?ex=674a2490&is=6748d310&hm=400037080f86f462ccb6f466b1d6ff69f02dc8511a5c8e712e9136ad6682c71f&';
    } else if (rating >= 3) {
        imageUrl = 'https://cdn.discordapp.com/attachments/1288807959685758987/1311791527533740124/RaZo_Thank_u.png?ex=674a2490&is=6748d310&hm=400037080f86f462ccb6f466b1d6ff69f02dc8511a5c8e712e9136ad6682c71f&';
    } else {
        imageUrl = 'https://cdn.discordapp.com/attachments/1288807959685758987/1311791527533740124/RaZo_Thank_u.png?ex=674a2490&is=6748d310&hm=400037080f86f462ccb6f466b1d6ff69f02dc8511a5c8e712e9136ad6682c71f&';
    }

    const ratingEmbed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`
        > **Rating** ${stars}
        > **Feedback: ${feedback}**
        > *Thank you for your feedback!*`)
        .setColor('#2b2d31')
        .setImage(imageUrl)
        .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&')
        .setTimestamp();

    // Send the mention and embed to logs channel
    await logsChannel.send({ 
        content: `${interaction.user}`,
        embeds: [ratingEmbed] 
    });

    // Update the confirmation message in the modal submit handler
    await interaction.reply({ 
        embeds: [
            new EmbedBuilder()
                .setDescription(`
                ### Thank you for your feedback! 🌟
                > Your rating has been successfully recorded
                > Our team appreciates your time and input
                
                *Your feedback helps us improve our services*`)
                .setColor('#2b2d31')
                .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png?ex=67498efb&is=67483d7b&hm=abf97f5dcad8ee9526594b5436731c398354f46e02b4cd3b23b070902be7e0a8&')
                .setTimestamp()
        ],
        ephemeral: true 
    });
});

// Update the saveTranscript function
async function saveTranscript(transcriptData) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = '2cpe';
    const REPO_NAME = 'ticket-transcripts';

    try {
        // Create the transcripts directory if it doesn't exist
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/transcripts/${transcriptData.id}.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Add transcript ${transcriptData.id}`,
                content: Buffer.from(JSON.stringify(transcriptData, null, 2)).toString('base64'),
                branch: 'main'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API responded with status ${response.status}: ${JSON.stringify(errorData)}`);
        }

        console.log('Transcript saved successfully');
    } catch (error) {
        console.error('Error saving transcript to GitHub:', error);
        throw error;
    }
}

client.login(config.token);
