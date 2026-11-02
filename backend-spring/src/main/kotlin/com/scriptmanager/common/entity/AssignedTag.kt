package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "assigned_tag", indexes = [Index(columnList = "id")])
class AssignedTag(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "tag_id", nullable = false)
    var tagId: Int = 0,
) {
    // Native image: no runtime HibernateProxy (BytecodeProvider=none).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_id", insertable = false, updatable = false)
    var tag: Tag? = null

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinTable(
        name = "rel_shellscript_tag",
        joinColumns = [JoinColumn(name = "assigned_tag_id", referencedColumnName = "id", insertable = false, updatable = false)],
        inverseJoinColumns = [JoinColumn(name = "shell_script_id", referencedColumnName = "id", insertable = false, updatable = false)]
    )
    var shellScript: ShellScript? = null
}
