/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "../../core/Command";
import { displayDate } from "../../utils/datetime";
import { userInfo } from "../../utils/embed";
import { safeUserFetch } from "../../utils/fetch";

export default class BallotViewCommand extends Command {
    public readonly name = "ballot__view";
    public readonly permissions = [];
    public readonly description = "Shows a poll/ballot.";
    public readonly supportsInteractions: boolean = false;
    public readonly supportsLegacy: boolean = false;

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please provide the ballot ID!");
            return;
        }

        await this.deferIfInteraction(message);

        const id = context.isLegacy ? parseInt(context.args[0]) : context.options.getInteger("id", true);

        if (isNaN(id)) {
            await this.error(message, "Invalid ballot ID given! Ballot IDs must be numeric values.");
            return;
        }

        const ballot = await this.client.ballotManager.get({
            id,
            guildId: message.guildId!
        });

        if (!ballot) {
            await this.error(message, "No such ballot exists with that ID!");
            return;
        }

        const user = await safeUserFetch(this.client, ballot.userId);
        const url = `https://discord.com/channels/${encodeURIComponent(ballot.guildId)}/${encodeURIComponent(
            ballot.channelId
        )}/${encodeURIComponent(ballot.messageId)}`;

        await this.deferredReply(message, {
            files: ballot.files.map(url => ({ attachment: url })),
            embeds: [
                {
                    author: {
                        name: ballot.anonymous ? "Staff" : user?.username ?? "Unknown",
                        icon_url: ballot.anonymous ? message.guild!.iconURL() ?? undefined : user?.displayAvatarURL(),
                        url
                    },
                    description: ballot.content,
                    color: 0x007bff,
                    fields: [
                        {
                            name: "Total Votes",
                            value: `⚪ **${ballot.upvotes.length - ballot.downvotes.length}**`,
                            inline: true
                        },
                        {
                            name: "Upvotes",
                            value: `${this.emoji("ArrowTop")} ${ballot.upvotes.length}`,
                            inline: true
                        },
                        {
                            name: "Downvotes",
                            value: `${this.emoji("ArrowDown")} ${ballot.downvotes.length}`,
                            inline: true
                        },
                        {
                            name: "Created At",
                            value: `${displayDate(ballot.createdAt)}`,
                            inline: true
                        },
                        {
                            name: "Updated At",
                            value: `${displayDate(ballot.updatedAt)}`,
                            inline: true
                        },
                        {
                            name: "Created By",
                            value: user ? userInfo(user) : "*Not available*"
                        }
                    ]
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setURL(url).setStyle(ButtonStyle.Link).setLabel("Go to ballot message")
                )
            ]
        });
    }
}
