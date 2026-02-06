package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.dto.HistoricalShellScriptResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptHistoriesQuery
import com.scriptmanager.repository.HistoricalShellScriptRepository
import org.springframework.stereotype.Component

@Component
class GetScriptHistoriesQueryHandler(
    private val historicalShellScriptRepository: HistoricalShellScriptRepository
) : QueryHandler<GetScriptHistoriesQuery, List<HistoricalShellScriptResponse>> {

    override fun handle(query: GetScriptHistoriesQuery): List<HistoricalShellScriptResponse> {
        return historicalShellScriptRepository.findTenWithShellScript()
            .filter { it.shellScript != null }
            .map {
                val folderPath = mutableListOf<String>()

                var currentFolder: ScriptsFolder? = it.shellScript?.parentFolder
                var currentWorkspace: String? = null
                while (currentFolder != null) {
                    folderPath.add(0, currentFolder.name ?: "")
                    if (currentFolder.parentFolder != null) {
                        currentFolder = currentFolder.parentFolder
                    } else {
                        // root level folder now, it has workspace
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
                    history = it.toDTO(),
                    shellScript = it.shellScript!!.toDTO()
                )
            }
    }
}

