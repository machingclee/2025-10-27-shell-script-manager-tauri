package com.scriptmanager.repository

import com.scriptmanager.common.entity.Tag
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface TagRepository : JpaRepository<Tag, Int> {
    fun findByNameIgnoreCase(name: String): Tag?

    @Query("select t from Tag t order by lower(t.name) asc")
    fun findAllOrderByName(): List<Tag>
}
