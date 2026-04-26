package com.scriptmanager.applicationrunners

import com.scriptmanager.common.entity.WorkspaceStatus
import com.scriptmanager.common.entity.WorkspaceStatusName
import com.scriptmanager.repository.WorkspaceStatusRepository
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class WorkspaceStatusInitialization(
    private val workspaceStatusRepository: WorkspaceStatusRepository
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments) {
        val existing = workspaceStatusRepository.findAll().map { it.name }.toSet()

        WorkspaceStatusName.entries.forEach { statusName ->
            if (statusName !in existing) {
                workspaceStatusRepository.save(WorkspaceStatus(name = statusName))
            }
        }
    }
}

