require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
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

client.transcripts = new Map();

const config = {
    token: process.env.BOT_TOKEN,
    adminRole: process.env.ADMIN_ROLE,
    // ticketCategory: process.env.TICKET_CATEGORY,
    logsChannel: process.env.LOGS_CHANNEL,
    ticketCloseLogs: process.env.TICKET_CLOSE_LOGS,
    fifaCategory: process.env.FIFA_CATEGORY,
    nitroCategory: process.env.NITRO_CATEGORY,
    outfitCategory: process.env.OUTFIT_CATEGORY,
    carCategory: process.env.CAR_CATEGORY,
    boostCategory: process.env.BOOST_CATEGORY,
    botCategory: process.env.BOT_CATEGORY
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
            > Select a category below to create a ticket
            > Our support team will assist you based on your selection
            
            *We aim to respond as quickly as possible*`)
            .setColor('#2b2d31')
            .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
            .setImage('https://cdn.discordapp.com/attachments/1288807959685758987/1311863168565379083/ZZZZZZZZZZZZ.png')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_category')
                    .setPlaceholder('Select a category')
                    .addOptions([
                        {
                            label: 'SUPPORT',
                            description: 'General support and assistance',
                            value: 'support',
                            emoji: '🎫'
                        },
                        {
                            label: 'FIFA',
                            description: 'FIFA related support',
                            value: 'fifa',
                            emoji: '⚽'
                        },
                        {
                            label: 'NITRO',
                            description: 'Nitro related support',
                            value: 'nitro',
                            emoji: '🎮'
                        },
                        {
                            label: 'OUTFIT',
                            description: 'Outfit related support',
                            value: 'outfit',
                            emoji: '👕'
                        },
                        {
                            label: 'CAR',
                            description: 'Car related support',
                            value: 'car',
                            emoji: '🚗'
                        },
                        {
                            label: 'BOOST',
                            description: 'Boost related support',
                            value: 'boost',
                            emoji: '🚀'
                        },
                        {
                            label: 'CUSTOM BOT',
                            description: 'Custom bot development support',
                            value: 'bot',
                            emoji: '🤖'
                        }
                    ])
            );

        await message.channel.send({ 
            embeds: [embed], 
            components: [row] 
        });
    }
});

// Update the interaction handler
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (!member.roles.cache.has(config.adminRole)) {
                return interaction.reply({ content: 'Only administrators can close tickets!', ephemeral: true });
            }
            await closeTicket(interaction);
        }
    }

    // Add this section for handling select menu
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_category') {
            try {
                // Defer the reply immediately
                await interaction.deferReply({ ephemeral: true });
                
                const category = interaction.values[0].toUpperCase();
                const ticketChannel = await createTicket(interaction, category);
                
                if (ticketChannel) {
                    await interaction.editReply({ 
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`
                                ### Ticket Created Successfully! 🎫
                                > Your ${category} ticket has been created at ${ticketChannel}
                                > Our support team will assist you shortly
                                
                                *Please be patient while we review your ticket*`)
                                .setColor('#2b2d31')
                                .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
                                .setTimestamp()
                        ]
                    });
                }
            } catch (error) {
                console.error('Error creating ticket:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'An error occurred while creating the ticket. Please try again.',
                        ephemeral: true 
                    });
                } else {
                    await interaction.editReply({ 
                        content: 'An error occurred while creating the ticket. Please try again.' 
                    });
                }
            }
        }
    }
});

async function createTicket(interaction, category) {
    const guild = interaction.guild;
    const user = interaction.user;

    // Check if user has any open tickets in any category
    const existingTicket = guild.channels.cache.find(
        channel => {
            // Check if channel name contains the user's name and is a ticket
            return channel.name.toLowerCase().includes(user.username.toLowerCase()) && 
                   channel.name.includes('-');
        }
    );

    if (existingTicket) {
        const ticketCategory = existingTicket.name.split('-')[0].toUpperCase();
        await interaction.editReply({ 
            embeds: [
                new EmbedBuilder()
                    .setDescription(`
                    ### You Already Have an Open Ticket! ⚠️
                    > You have an active ${ticketCategory} ticket: ${existingTicket}
                    > Please close your current ticket before creating a new one
                    
                    *You can only have one ticket open at a time*`)
                    .setColor('#ff0000')
                    .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
                    .setTimestamp()
            ]
        });
        return null;
    }

    // Get category ID from config
    const categoryId = config[`${category.toLowerCase()}Category`] || config.ticketCategory;

    // Create the ticket channel
    const ticketChannel = await guild.channels.create({
        name: `${category.toLowerCase()}-${user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: categoryId,
        topic: `Ticket Creator ID: ${user.id} | Category: ${category}`,
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
            name: `${category} Support Ticket`,
            iconURL: 'https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png'
        })
        .setDescription(`
        ### Welcome to your ${category} ticket! 👋
        > Ticket created by: ${user}
        > Category: ${category}
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
    }, 1000);

    return ticketChannel;
}

// Add this function at the top level of your code to generate a unique ID
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15);
}

// Update the closeTicket function
async function closeTicket(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.channel;
        const topic = channel.topic;
        
        if (!topic) {
            await interaction.editReply({ content: 'Could not find ticket information.' });
            return;
        }

        const userIdMatch = topic.match(/Ticket Creator ID: (\d+)/);
        if (!userIdMatch) {
            await interaction.editReply({ content: 'Could not find the ticket creator.' });
            return;
        }

        const userId = userIdMatch[1];

        try {
            const user = await client.users.fetch(userId);
            if (!user) {
                await interaction.editReply({ content: 'Could not find the ticket creator.' });
                return;
            }

            // Generate transcript data
            const messages = await channel.messages.fetch();
            const transcriptId = generateUniqueId();
            
            // Create and store transcript data
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

            // Store transcript data and channel info
            client.transcripts.set(channel.id, {
                transcriptData,
                transcriptId,
                channelName: channel.name,
                channelToDelete: channel,
                user: user,
                closer: interaction.user
            });

            // Send rating request in the ticket channel
            const ratingEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Ticket Rating',
                    iconURL: 'https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png'
                })
                .setDescription(`
                ### Rate Your Experience 🌟
                > Please rate your support experience from 1-5 stars
                > Your feedback helps us improve our service
                
                *Click a button below to rate*`)
                .setColor('#2b2d31')
                .setTimestamp();

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

            // Send rating request in the ticket channel
            await channel.send({ 
                content: `${user}`,
                embeds: [ratingEmbed], 
                components: [ratingRow] 
            });

            // Update interaction with waiting message
            await interaction.editReply({ 
                content: 'Waiting for user to rate the ticket...',
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in ticket closure:', error);
            await interaction.editReply({ 
                content: 'An error occurred while closing the ticket. Please try again.' 
            });
        }

    } catch (error) {
        console.error('Error in closeTicket:', error);
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

// Update the rating button handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('rate_')) return;

    const rating = interaction.customId.split('_')[1];
    const transcriptInfo = client.transcripts.get(interaction.channel.id);

    if (!transcriptInfo) {
        await interaction.reply({ content: 'Could not find ticket information.', ephemeral: true });
        return;
    }

    if (interaction.user.id !== transcriptInfo.user.id) {
        await interaction.reply({ content: 'Only the ticket creator can rate the ticket.', ephemeral: true });
        return;
    }

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

// Update the modal submit handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('feedback_')) return;

    try {
        // Defer the reply immediately
        await interaction.deferReply({ ephemeral: true });

        const rating = interaction.customId.split('_')[1];
        const feedback = interaction.fields.getTextInputValue('feedback_text');
        const logsChannel = await client.channels.fetch(config.logsChannel);

        // Get stored transcript data using channel ID instead of user ID
        const transcriptInfo = client.transcripts.get(interaction.channel?.id);
        if (!transcriptInfo) {
            await interaction.editReply({ content: 'Could not find ticket information.' });
            return;
        }

        const { transcriptData, transcriptId, channelName, channelToDelete, user, closer } = transcriptInfo;

        try {
            // Save transcript to GitHub
            await saveTranscript(transcriptData);

            // Send rating embed to logs channel
            const ratingEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`
                > **Rating** ${'⭐'.repeat(parseInt(rating))}
                > **Feedback: ${feedback}**
                > *Thank you for your feedback!*`)
                .setColor('#2b2d31')
                .setImage('https://cdn.discordapp.com/attachments/1288807959685758987/1311791527533740124/RaZo_Thank_u.png')
                .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
                .setTimestamp();

            // Send rating to logs channel
            await logsChannel.send({ 
                content: `${interaction.user}`,
                embeds: [ratingEmbed] 
            });

            // Send close notification to logs channel
            const closeLogsChannel = await client.channels.fetch(config.ticketCloseLogs);
            const ticketCloseEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Ticket Closed',
                })
                .setDescription(`
                ### 🎫 Ticket Details
                > **Channel:** \`${channelName}\`
                > **Status:** Closed
                > **Action by:** ${closer}
                > **User:** ${user}
                > **Date:** <t:${Math.floor(Date.now() / 1000)}:F>
                
                *Transcript has been sent to the user*`)
                .setColor('#2b2d31')
                .setThumbnail('https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png')
                .setTimestamp();

            await closeLogsChannel.send({
                embeds: [ticketCloseEmbed]
            });

            // Send transcript embed to user
            const transcriptEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Ticket Transcript',
                    iconURL: 'https://cdn.discordapp.com/attachments/1287013277607530571/1311268530016223232/rz5.png'
                })
                .setDescription(`
                ### 📝 Ticket Transcript Ready
                > **Ticket:** \`${channelName}\`
                > Click the button below to view the transcript
                
                *This transcript will be available for 24 hours*`)
                .setColor('#2b2d31')
                .setTimestamp();

            const transcriptRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Transcript')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://2cpe.github.io/ticket-transcripts/?id=${transcriptId}&userId=${user.id}&creator=${user.id}`)
                        .setEmoji('📄')
                );

            // Send transcript to user
            await user.send({
                embeds: [transcriptEmbed],
                components: [transcriptRow]
            });

            // Clear stored transcript data
            client.transcripts.delete(interaction.channel?.id);

            // Delete the ticket channel
            if (channelToDelete) {
                setTimeout(async () => {
                    try {
                        await channelToDelete.delete();
                    } catch (error) {
                        console.error('Error deleting channel:', error);
                    }
                }, 1000);
            }

            // Update interaction with success message
            await interaction.editReply({ 
                content: 'Thank you for your feedback! Your transcript has been sent to your DMs.',
            });

        } catch (error) {
            console.error('Error handling rating:', error);
            await interaction.editReply({ 
                content: 'An error occurred while processing your rating. Please try again.' 
            });
        }

    } catch (error) {
        console.error('Error in modal submit handler:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your rating.',
                ephemeral: true 
            });
        } else {
            await interaction.editReply({ 
                content: 'An error occurred while processing your rating.' 
            });
        }
    }
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
