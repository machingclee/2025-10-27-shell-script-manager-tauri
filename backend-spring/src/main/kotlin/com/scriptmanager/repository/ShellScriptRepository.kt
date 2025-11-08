package com.scriptmanager.repository

import com.scriptmanager.common.entity.ShellScript
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ShellScriptRepository : JpaRepository<ShellScript, Int> {
    fun findAllByOrderByOrderingAsc(): List<ShellScript>

    @Query(
        """
        SELECT s FROM ShellScript s LEFT JOIN FETCH s.parentFolder WHERE s.parentFolder.id = :folderId ORDER BY s.ordering ASC
    """
    )
    fun findByFolderId(@Param("folderId") folderId: Int): List<ShellScript>
}

