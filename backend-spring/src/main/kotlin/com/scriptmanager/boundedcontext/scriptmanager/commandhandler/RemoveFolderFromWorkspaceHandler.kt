package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.dto.toWorkspaceWithFoldersDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.RemoveFolderFromWorkspaceCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderRemovedFromWorkspaceEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class RemoveFolderFromWorkspaceHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<RemoveFolderFromWorkspaceCommand, WorkspaceWithFoldersDTO> {

    override fun handle(eventQueue: EventQueue, command: RemoveFolderFromWorkspaceCommand): WorkspaceWithFoldersDTO {
        val orphanedRootLevelFolders = folderRepository.findAllRootLevelFolder()

        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw ScriptManagerException("Folder not found")

        val workspace = workspaceRepository.findByIdOrNull(folder.parentWorkspace?.id ?: -1)
            ?: throw ScriptManagerException("Workspace not found")

        workspace.removeAndReorderFolder(folder)

        val reorderedFolders = orphanedRootLevelFolders.toMutableList()
        reorderedFolders.add(0, folder)
        reorderedFolders.forEachIndexed { index, f ->
            f.ordering = index
        }
        folderRepository.saveAll(reorderedFolders)

        val result = workspace.toWorkspaceWithFoldersDTO()
        eventQueue.add(
            FolderRemovedFromWorkspaceEvent(
                workspace = result,
                folderId = command.folderId
            )
        )

        return result
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        FolderRemovedFromWorkspaceEvent::class.java
    )
}
