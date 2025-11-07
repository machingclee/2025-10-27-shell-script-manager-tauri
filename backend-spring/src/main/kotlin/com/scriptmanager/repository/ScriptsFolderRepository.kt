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
        where sf.parentFolder is null
        order by sf.ordering asc
    """
    )
    fun findAllByOrderByOrderingAsc(): List<ScriptsFolder>
}

