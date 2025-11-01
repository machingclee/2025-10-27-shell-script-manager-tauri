package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "shell_script", indexes = [Index(columnList = "id")])
data class ShellScript(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "command", nullable = false)
    var command: String = "",

    @Column(name = "ordering", nullable = false)
    var ordering: Int = 0,

    @Column(name = "created_at")
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    val createdAtHk: String? = null,
) {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_scriptsfolder_shellscript",
        joinColumns = [JoinColumn(name = "shell_script_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "scripts_folder_id", referencedColumnName = "id")]
    )
    var scriptsFolder: ScriptsFolder? = null
}
