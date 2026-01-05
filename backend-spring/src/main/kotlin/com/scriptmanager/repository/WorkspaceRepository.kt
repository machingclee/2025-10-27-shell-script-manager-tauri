package com.scriptmanager.repository

import com.scriptmanager.common.entity.Workspace
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface WorkspaceRepository : JpaRepository<Workspace, Int> {
    @Query(
        """
        select ws from Workspace ws
        left join fetch ws.folders folder
        left join fetch folder.shellScripts script
        left join fetch folder.subfolders subfolder
        left join fetch subfolder.subfolders subsubfolder
        left join fetch subfolder.shellScripts
        left join fetch subfolder.parentFolder
        left join fetch subsubfolder.shellScripts
        left join fetch subsubfolder.parentFolder
    """
    )
    fun findAllFetchingFoldersAndShellScripts(): List<Workspace>
}

