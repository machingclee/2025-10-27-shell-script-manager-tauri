package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "tag", indexes = [Index(columnList = "id")])
class Tag(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "tag_folder_id")
    var tagFolderId: Int? = null,
) {
    // Native image: no runtime HibernateProxy (BytecodeProvider=none).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_folder_id", insertable = false, updatable = false)
    var tagFolder: TagFolder? = null

    @OneToMany(mappedBy = "tag", fetch = FetchType.LAZY)
    var assignedTags: MutableSet<AssignedTag> = mutableSetOf()
}
