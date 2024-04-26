import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type InfractionManager from "@main/services/InfractionManager";
import { LogEventType } from "@main/types/LoggingSchema";
import type { GuildMember } from "discord.js";

class GuildMemberAddEventListener extends EventListener<Events.GuildMemberAdd> {
    public override readonly name = Events.GuildMemberAdd;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("infractionManager")
    protected readonly infractionManager!: InfractionManager;

    public override async execute(member: GuildMember): Promise<void> {
        this.auditLoggingService.emitLogEvent(member.guild.id, LogEventType.GuildMemberAdd, member);
        this.infractionManager.reapplyMuteIfNeeded(member);
    }
}

export default GuildMemberAddEventListener;