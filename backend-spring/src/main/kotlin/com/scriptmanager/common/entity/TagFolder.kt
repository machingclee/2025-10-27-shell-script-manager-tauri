package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "tag_folder", indexes = [Index(columnList = "id")])
class TagFolder(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "ordering", nullable = false)
    var ordering: Int = 0,
)
