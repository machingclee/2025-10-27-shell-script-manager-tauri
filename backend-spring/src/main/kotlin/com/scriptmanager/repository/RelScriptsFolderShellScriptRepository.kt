package com.scriptmanager.repository

import com.scriptmanager.entity.RelScriptsFolderShellScript
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface RelScriptsFolderShellScriptRepository : JpaRepository<RelScriptsFolderShellScript, Int> {
    fun findByScriptsFolderId(folderId: Int): List<RelScriptsFolderShellScript>
    fun findByShellScriptId(scriptId: Int): List<RelScriptsFolderShellScript>
}

