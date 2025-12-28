package com.scriptmanager.repository

import com.scriptmanager.common.entity.AiProfile
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AIProfileRepository : JpaRepository<AiProfile, Int> {

}