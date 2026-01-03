package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.Cascade
import org.hibernate.annotations.CascadeType
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "scripts_folder", indexes = [Index(columnList = "id")])
class ScriptsFolder(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "ordering", nullable = false)
    var ordering: Int = 0,

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null
) {


    @OneToMany(fetch = FetchType.LAZY, orphanRemoval = true)
    @Cascade(CascadeType.ALL)
    @JoinTable(
        name = "rel_scriptsfolder_shellscript",
        joinColumns = [JoinColumn(name = "scripts_folder_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "shell_script_id", referencedColumnName = "id")]
    )
    var shellScripts: MutableSet<ShellScript> = mutableSetOf()


    @OneToMany(fetch = FetchType.LAZY, orphanRemoval = true)
    @Cascade(CascadeType.ALL)
    @JoinTable(
        name = "rel_folder_folder",
        joinColumns = [JoinColumn(name = "parent_folder_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "child_folder_id", referencedColumnName = "id")]
    )
    var subfolders: MutableSet<ScriptsFolder> = mutableSetOf()

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_folder_folder",
        joinColumns = [JoinColumn(name = "child_folder_id", referencedColumnName = "id", insertable = false)],
        inverseJoinColumns = [JoinColumn(name = "parent_folder_id", referencedColumnName = "id", insertable = false)]
    )
    var parentFolder: ScriptsFolder? = null


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_workspace_folder",
        joinColumns = [JoinColumn(name = "folder_id", referencedColumnName = "id", insertable = false)],
        inverseJoinColumns = [JoinColumn(name = "workspace_id", referencedColumnName = "id", insertable = false)]
    )
    var parentWorkspace: Workspace? = null


    fun removeScript(script: ShellScript) {
        shellScripts.removeIf { it.id == script.id }
        shellScripts.forEachIndexed { idx, s ->
            s.ordering = idx
        }
    }

    fun addScript(script: ShellScript) {
        shellScripts.add(script)
    }

    fun addFolder(newSubfolder: ScriptsFolder) {
        subfolders.add(newSubfolder)
    }

    fun removeFolder(folder: ScriptsFolder) {
        subfolders.remove(folder)
        subfolders.forEachIndexed { idx, f ->
            f.ordering = idx
        }
    }

    fun resetScriptOrders() {
        shellScripts.sortedBy { it.ordering }.forEachIndexed { idx, s ->
            s.ordering = idx
        }
    }

    fun resetFolderOrders() {
        subfolders.sortedBy { it.ordering }.forEachIndexed { idx, f ->
            f.ordering = idx
        }
    }

    fun getAllSubfolders(): Set<ScriptsFolder> {
        val allSubfolders = mutableSetOf<ScriptsFolder>()
        fun collectSubfolders(folder: ScriptsFolder) {
            folder.subfolders.forEach { subfolder ->
                allSubfolders.add(subfolder)
                collectSubfolders(subfolder)
            }
        }
        collectSubfolders(this)
        return allSubfolders
    }

    data class ScriptWithFolder(
        val script: ShellScript,
        val folder: ScriptsFolder
    )

    fun getAllShellScripts(): Set<ScriptWithFolder> {
        val allScripts = mutableSetOf<ScriptWithFolder>()
        fun collectScripts(folder: ScriptsFolder) {
            folder.shellScripts.forEach { script ->
                allScripts.add(ScriptWithFolder(script, folder))
            }
            folder.subfolders.forEach { subfolder ->
                collectScripts(subfolder)
            }
        }
        collectScripts(this)
        return allScripts
    }
}





