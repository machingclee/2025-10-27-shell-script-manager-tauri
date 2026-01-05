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
        left join fetch folder.shellScripts scripts
        left join fetch folder.parentFolder
    """
    )
    fun findAllFetchingFoldersAndShellScripts(): List<Workspace>
}

