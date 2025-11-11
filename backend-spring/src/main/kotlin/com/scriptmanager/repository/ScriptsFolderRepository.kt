package com.scriptmanager.repository

import com.scriptmanager.common.entity.ScriptsFolder
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface ScriptsFolderRepository : JpaRepository<ScriptsFolder, Int> {
    @Query(
        """
        select sf from ScriptsFolder sf
        left join fetch sf.parentWorkspace
        where sf.parentFolder is null and sf.parentWorkspace is null
        order by sf.ordering asc
    """
    )
    fun findAllRootLevelFolder(): MutableList<ScriptsFolder>
}

