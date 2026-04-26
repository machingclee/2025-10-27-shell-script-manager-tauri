package com.scriptmanager.repository

import com.scriptmanager.common.entity.WorkspaceStatus
import com.scriptmanager.common.entity.WorkspaceStatusName
import org.springframework.data.repository.CrudRepository

interface WorkspaceStatusRepository : CrudRepository<WorkspaceStatus, Int> {

    fun findByName(name: WorkspaceStatusName): WorkspaceStatus?
}