package com.scriptmanager.repository

import com.scriptmanager.common.entity.TagFolder
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface TagFolderRepository : JpaRepository<TagFolder, Int> {
    @Query("select f from TagFolder f order by f.ordering asc, f.id asc")
    fun findAllOrderByOrdering(): List<TagFolder>
}
