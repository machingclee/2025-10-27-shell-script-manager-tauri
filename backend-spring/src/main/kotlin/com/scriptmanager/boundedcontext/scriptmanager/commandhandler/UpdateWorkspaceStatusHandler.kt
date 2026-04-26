package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.UpdateWorkspaceStatusCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.WorkspaceStatusUpdatedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.common.entity.WorkspaceStatus
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.WorkspaceRepository
import com.scriptmanager.repository.WorkspaceStatusRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component


@Component
class UpdateWorkspaceStatusHandler(
    private val workspaceRepository: WorkspaceRepository,
    private val workspaceStatusRepository: WorkspaceStatusRepository
) : CommandHandler<UpdateWorkspaceStatusCommand, Unit> {
    override fun handle(eventQueue: EventQueue, command: UpdateWorkspaceStatusCommand) {
        val (workspaceid, newStatus) = command
        val workspace = workspaceRepository.findByIdOrNull(workspaceid) ?: throw ScriptManagerException("Set not found");
        val targetNewStatus = workspaceStatusRepository.findByName(newStatus) ?: throw ScriptManagerException("No such status");
        val prevStatus = workspace.statuses.map { it.name }
        workspace.statuses = mutableSetOf(targetNewStatus)
        val event = WorkspaceStatusUpdatedEvent(
            workspaceId = workspaceid,
            previousStatus = prevStatus,
            currentStatus = workspace.statuses.map { it.name }
        )
        eventQueue.add(event)
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        WorkspaceStatusUpdatedEvent::class.java
    )

}