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
        left join fetch history.shellScript script
        left join fetch script.parentFolder folder1
        left join fetch folder1.parentWorkspace workspace1
        left join fetch folder1.parentFolder folder2
        left join fetch folder2.parentWorkspace workspace2
        order by history.executedAt desc
        limit 10
    """
    )
    fun findTenWithShellScript(): List<HistoricalShellScript>
}
