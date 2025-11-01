package com.scriptmanager.repository

import com.scriptmanager.common.entity.ScriptsFolder
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ScriptsFolderRepository : JpaRepository<ScriptsFolder, Int> {
    fun findAllByOrderByOrderingAsc(): List<ScriptsFolder>
}

