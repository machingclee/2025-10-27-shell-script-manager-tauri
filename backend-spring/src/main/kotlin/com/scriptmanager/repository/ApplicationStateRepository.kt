package com.scriptmanager.repository

import com.scriptmanager.entity.ApplicationState
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ApplicationStateRepository : JpaRepository<ApplicationState, Int>

