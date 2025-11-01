package com.scriptmanager.repository

import com.scriptmanager.common.entity.AppState
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AppStateRepository : JpaRepository<AppState, Int> {
    fun findFirstByOrderByIdAsc(): AppState?
}

