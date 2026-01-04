package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.script.MoveScriptToFolderCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptMovedToFolderEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class MoveScriptToFolderHandler(
    private val scriptRepository: ShellScriptRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val entityManager: EntityManager
) : CommandHandler<MoveScriptToFolderCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: MoveScriptToFolderCommand) {
        val script = scriptRepository.findByIdOrNull(command.scriptId)
            ?: throw Exception("Script not found")
        val targetFolder = folderRepository.findByIdOrNull(command.targetFolderId)
            ?: throw Exception("Folder not found")

        script.parentFolder = targetFolder
        script.ordering = -1
        entityManager.flush()
        entityManager.refresh(targetFolder)
        targetFolder.resetScriptOrders()
        folderRepository.save(targetFolder)

        eventQueue.add(
            ScriptMovedToFolderEvent(
                scriptId = command.scriptId,
                targetFolderId = command.targetFolderId
            )
        )
    }
}

