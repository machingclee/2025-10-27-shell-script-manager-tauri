package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.Cascade
import org.hibernate.annotations.CascadeType
import org.hibernate.annotations.DynamicInsert

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
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
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

    fun removeScript(script: ShellScript) {
        shellScripts.removeIf { it.id == script.id }
        shellScripts.forEachIndexed { idx, s ->
            s.ordering = idx
        }
    }

    fun addScript(script: ShellScript) {
        shellScripts.add(script)
        shellScripts.forEachIndexed { idx, s ->
            s.ordering = idx
        }
    }

    fun addFolder(newSubfolder: ScriptsFolder) {
        subfolders.add(newSubfolder)
        subfolders.forEachIndexed { idx, f ->
            f.ordering = idx
        }
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
}





