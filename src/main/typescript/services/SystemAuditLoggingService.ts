import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import {
    Collection,
    Guild,
    MessageCreateOptions,
    MessagePayload,
    User,
    WebhookClient,
    cleanCodeBlockContent,
    codeBlock
} from "discord.js";

@Name("systemAuditLogging")
class SystemAuditLoggingService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    private _webhookClient?: WebhookClient;
    private readonly _guildInviteFetchStatus = new Collection<string, boolean>();

    private async log(options: MessageCreateOptions | MessagePayload) {
        if (!this.configManager.systemConfig.logging?.enabled) {
            return;
        }

        if (!this._webhookClient) {
            this._webhookClient = new WebhookClient({
                url: this.configManager.systemConfig.logging.webhook_url
            });
        }

        await this._webhookClient.send(options).catch(console.error);
    }

    public async logEchoCommandExecuted(payload: LogEchoCommandExecutedPayload) {
        let invite = payload.guild.vanityURLCode
            ? `https://discord.gg/${payload.guild.vanityURLCode}`
            : payload.guild.invites.cache.first()?.url;

        if (!invite && !this._guildInviteFetchStatus.get(payload.guild.id)) {
            try {
                this.application.logger.debug("Re-fetching guild invites", payload.guild.id);
                invite = (await payload.guild.invites.fetch()).first()?.url;
            } catch {
                this._guildInviteFetchStatus.set(payload.guild.id, false);
                setTimeout(
                    () => this._guildInviteFetchStatus.delete(payload.guild.id),
                    1000 * 60 * 30
                );
            }
        }

        await this.log({
            content: `
                # Echo-family Command Executed
                **Guild:** ${payload.guild.name} (${payload.guild.id})
                **Invite:** ${invite ? `<${invite}>` : "*Unavailable*"}
                **User:** ${payload.user.tag} (${payload.user.id})
                **Command:** ${payload.command}
                **Raw Content:** ${codeBlock(cleanCodeBlockContent(payload.rawCommandContent))}\n
                __The following message was generated by the command:__
            `.replace(/\n(\t|\s+)/gm, "\n")
        });

        await this.log({
            ...(payload.generatedMessageOptions as MessageCreateOptions),
            allowedMentions: {
                parse: [],
                users: [],
                roles: []
            }
        });
    }
}

type LogEchoCommandExecutedPayload = {
    guild: Guild;
    user: User;
    command: string;
    rawCommandContent: string;
    generatedMessageOptions: MessageCreateOptions | MessagePayload;
};

export default SystemAuditLoggingService;
