package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptHistoriesQuery
import com.scriptmanager.common.dto.HistoricalShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.HistoricalShellScriptRepository
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.stereotype.Component

@Component
class GetScriptHistoriesQueryHandler(
    private val historicalShellScriptRepository: HistoricalShellScriptRepository,
    private val shellScriptRepository: ShellScriptRepository,
) : QueryHandler<GetScriptHistoriesQuery, List<HistoricalShellScriptResponse>> {

    override fun handle(query: GetScriptHistoriesQuery): List<HistoricalShellScriptResponse> {
        val histories = historicalShellScriptRepository.findTenWithShellScript()
            .filter { it.shellScript != null }
        val scriptIds = histories.mapNotNull { it.shellScript?.id }
        if (scriptIds.isNotEmpty()) {
            // Same persistence context: this initializes assignedTags on the scripts above.
            shellScriptRepository.fetchAssignedTags(scriptIds)
        }
        return histories.map {
                val folderPath = mutableListOf<String>()

                var currentFolder: ScriptsFolder? = it.shellScript?.parentFolder
                var currentWorkspace: String? = null
                var rootFolderId: Int? = null
                while (currentFolder != null) {
                    folderPath.add(0, currentFolder.name ?: "")
                    if (currentFolder.parentFolder != null) {
                        currentFolder = currentFolder.parentFolder
                    } else {
                        // Root-level folder (direct child of workspace / top-level root)
                        rootFolderId = currentFolder.id
                        currentWorkspace = currentFolder.parentWorkspace?.name?.value
                        break
                    }
                }

                var parentFolderPath = folderPath.joinToString(" > ") + " /"

                if (currentWorkspace != null) {
                    parentFolderPath = currentWorkspace + " > " + parentFolderPath
                }

                HistoricalShellScriptResponse(
                    parentFolderPath = parentFolderPath,
                    rootFolderId = rootFolderId,
                    history = it.toDTO(),
                    shellScript = it.shellScript!!.toResponse()
                )
            }
    }
}
