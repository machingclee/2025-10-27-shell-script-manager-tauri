package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.stereotype.Component

@Component
class CreateFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<CreateFolderCommand, ScriptsFolder> {

    override fun handle(eventQueue: EventQueue, command: CreateFolderCommand): ScriptsFolder {
        // Get count of folders to determine ordering
        val count = folderRepository.findAll().size

        // Create folder with ordering
        val newFolder = ScriptsFolder(
            name = command.name,
            ordering = count
        )

        val savedFolder = folderRepository.save(newFolder)

        eventQueue.add(FolderCreatedEvent(savedFolder.toDTO()))

        return savedFolder
    }
    
    override fun declareEvents(): List<Class<*>> {
        return listOf(FolderCreatedEvent::class.java)
    }
}

