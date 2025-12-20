package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "shell_script", indexes = [Index(columnList = "id")])
class ShellScript(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "command", nullable = false)
    var command: String = "",

    @Column(name = "ordering", nullable = false)
    var ordering: Int = 0,

    @Column(name = "locked")
    var locked: Boolean? = false,

    @Column(name = "show_shell")
    var showShell: Boolean = false,

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "is_markdown")
    val isMarkdown: Boolean

) {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_scriptsfolder_shellscript",
        joinColumns = [JoinColumn(name = "shell_script_id", referencedColumnName = "id", insertable = false)],
        inverseJoinColumns = [JoinColumn(name = "scripts_folder_id", referencedColumnName = "id", insertable = false)]
    )
    var parentFolder: ScriptsFolder? = null
}
