package com.scriptmanager.entity

import jakarta.persistence.*

@Entity
@Table(
    name = "rel_scriptsfolder_shellscript",
    indexes = [
        Index(columnList = "scripts_folder_id"),
        Index(columnList = "shell_script_id")
    ]
)
data class RelScriptsFolderShellScript(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,
    
    @Column(name = "scripts_folder_id", nullable = false)
    val scriptsFolderId: Int = 0,
    
    @Column(name = "shell_script_id", nullable = false)
    val shellScriptId: Int = 0,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Double = 0.0,
    
    @Column(name = "created_at_hk", nullable = false)
    val createdAtHk: String = "",
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scripts_folder_id", insertable = false, updatable = false)
    val scriptsFolder: ScriptsFolder? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shell_script_id", insertable = false, updatable = false)
    val shellScript: ShellScript? = null
)

