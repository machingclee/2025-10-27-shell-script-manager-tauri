package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.MoveScriptToFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptMovedToFolderEvent
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
            ?: throw ScriptManagerException("Script not found")
        val targetFolder = folderRepository.findByIdOrNull(command.targetFolderId)
            ?: throw ScriptManagerException("Folder not found")

        val originalFolder = script.parentFolder
        if (originalFolder != null) {
            originalFolder.removeAndReorderScripts(script)
            entityManager.flush()
            entityManager.refresh(originalFolder)
        }
        targetFolder.addAndReorderScript(script)
        entityManager.flush()
        entityManager.refresh(targetFolder)

        eventQueue.add(
            ScriptMovedToFolderEvent(
                scriptId = command.scriptId,
                targetFolderId = command.targetFolderId
            )
        )
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        ScriptMovedToFolderEvent::class.java
    )
}
