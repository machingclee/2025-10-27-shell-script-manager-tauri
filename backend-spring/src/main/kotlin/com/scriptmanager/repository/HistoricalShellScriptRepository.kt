package com.scriptmanager.repository

import com.scriptmanager.common.entity.HistoricalShellScript
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface HistoricalShellScriptRepository : JpaRepository<HistoricalShellScript, Int> {
    fun findAllByShellScriptId(shellScriptId: Int): List<HistoricalShellScript>
    fun findAllByShellScriptIdOrderByExecutedAtDesc(shellScriptId: Int): List<HistoricalShellScript>
    fun findFirstByShellScriptId(shellScriptId: Int): HistoricalShellScript?

    @Query(
        """
        select history from HistoricalShellScript history
        left join fetch history.shellScript
        order by history.executedAt desc
        limit 10
    """
    )
    fun findTenWithShellScript(): List<HistoricalShellScript>
}
