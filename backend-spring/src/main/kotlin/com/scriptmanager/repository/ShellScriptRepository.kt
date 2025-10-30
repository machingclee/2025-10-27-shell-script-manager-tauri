package com.scriptmanager.repository

import com.scriptmanager.entity.ShellScript
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ShellScriptRepository : JpaRepository<ShellScript, Int> {
    fun findAllByOrderByOrderingAsc(): List<ShellScript>
}

