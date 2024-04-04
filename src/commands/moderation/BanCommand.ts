/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { PermissionFlagsBits, User } from "discord.js";
import { Limits } from "../../constants/Limits";
import { TakesArgument } from "../../framework/arguments/ArgumentTypes";
import RestStringArgument from "../../framework/arguments/RestStringArgument";
import UserArgument from "../../framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "../../framework/commands/Command";
import Context from "../../framework/commands/Context";
import { Inject } from "../../framework/container/Inject";
import { also } from "../../framework/utils/utils";
import InfractionManager from "../../services/InfractionManager";
import IntegerArgument from "../../framework/arguments/IntegerArgument";
import { ErrorType } from "../../framework/arguments/InvalidArgumentError";
import { formatDistanceToNowStrict } from "date-fns";

type BanCommandArgs = {
    user: User;
    reason?: string;
    duration?: number;
    deletionTimeframe?: number;
};

@TakesArgument<BanCommandArgs>({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    rules: {
        "interaction:no_required_check": true
    },
    errorMessages: [
        {
            [ErrorType.EntityNotFound]: "The user you provided was not found.",
            [ErrorType.InvalidType]: "Invalid user provided.",
            [ErrorType.Required]: "You must provide a user to ban."
        }
    ],
    interactionName: "user"
})
@TakesArgument<BanCommandArgs>({
    names: ["duration", "reason"],
    types: [IntegerArgument, RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason or duration provided."
        }
    ],
    interactionName: "duration",
    interactionType: IntegerArgument
})
@TakesArgument<BanCommandArgs>({
    names: ["deletionTimeframe", "reason"],
    types: [IntegerArgument, RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason or message deletion timeframe provided."
        }
    ],
    interactionName: "deletion_timeframe",
    interactionType: IntegerArgument
})
@TakesArgument<BanCommandArgs>({
    names: ["reason"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason provided."
        }
    ],
    interactionName: "reason",
    interactionType: RestStringArgument
})
class BanCommand extends Command {
    public override readonly name = "ban";
    public override readonly description = "Bans a user.";
    public override readonly detailedDescription = "Bans a user from the server.";
    public override readonly permissions = [PermissionFlagsBits.BanMembers];
    public override readonly defer = true;

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("user").setDescription("The user to ban.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the bean.")
                        .setMaxLength(Limits.Reason)
                )
                .addIntegerOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the bean.")
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("deletion_timeframe")
                        .setDescription("The message deletion timeframe.")
                        .setRequired(false)
                ),
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: BanCommandArgs
    ): Promise<void> {
        console.log(args);
        const { user, reason } = args;
        const { overviewEmbed, status } = await this.infractionManager.createBan({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            user,
            generateOverviewEmbed: true,
            duration: args.duration,
            deletionTimeframe: args.deletionTimeframe
        });

        if (status === "failed") {
            await context.error("Failed to ban user. Maybe I don't have the permissions to do so.");
            return;
        }

        await context.reply({
            embeds: [
                also(overviewEmbed, embed => void embed.fields?.push({
                    name: "Message Deletion Timeframe",
                    value: args.deletionTimeframe ? formatDistanceToNowStrict(new Date(Date.now() - args.deletionTimeframe)) : "N/A",
                }))
            ]
        });
    }
}

export default BanCommand;
