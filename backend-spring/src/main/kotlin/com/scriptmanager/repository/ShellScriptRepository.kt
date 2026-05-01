package com.scriptmanager.repository

import com.scriptmanager.common.entity.ShellScript
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
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

    @Query(
        value = "UPDATE shell_script SET is_editing = false",
        nativeQuery = true
    )
    @Modifying
    fun resetAllScriptItemsIsEditingStatus(): Int

    @Query(
        """
        SELECT s FROM ShellScript s JOIN FETCH s.parentFolder f WHERE f.systemLevel = com.scriptmanager.common.entity.SystemLevel.SYSTEM ORDER BY s.ordering ASC
        """
    )
    fun findDraftScripts(): List<ShellScript>

    @Query(
        """
        SELECT s FROM ShellScript s
        WHERE LOWER(s.name) LIKE LOWER('%' || :search || '%')
           OR LOWER(s.command) LIKE LOWER('%' || :search || '%')
        ORDER BY s.createdAt DESC
        """
    )
    fun searchByNameOrCommand(@Param("search") search: String, pageable: Pageable): Page<ShellScript>
}
