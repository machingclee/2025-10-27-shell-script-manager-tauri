package com.scriptmanager.repository

import com.scriptmanager.common.entity.ApplicationState
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AppStateRepository : JpaRepository<ApplicationState, Int> {
    fun findFirstByOrderByIdAsc(): ApplicationState?
}

