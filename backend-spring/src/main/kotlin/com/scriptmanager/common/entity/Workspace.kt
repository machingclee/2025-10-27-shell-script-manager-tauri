package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.Cascade
import org.hibernate.annotations.CascadeType
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "workspace", indexes = [Index(columnList = "id")])
class Workspace(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Embedded
    var name: Name,

    @Column(name = "ordering", nullable = false)
    var ordering: Int = 0,

    @Column(name = "created_at")
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    val createdAtHk: String? = null
) {
    @Embeddable
    class Name(
        @Column(name = "name", nullable = false)
        var value: String,
    ) {
        init {
            require(value.isNotBlank()) { "Workspace name cannot be blank" }
            require(value.length >= 3) { "Workspace name must be at least 3 characters long" }
        }
    }

    @OneToMany(fetch = FetchType.LAZY, orphanRemoval = true)
    @Cascade(CascadeType.ALL)
    @JoinTable(
        name = "rel_workspace_folder",
        joinColumns = [JoinColumn(name = "workspace_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "folder_id", referencedColumnName = "id")]
    )
    var folders: MutableSet<ScriptsFolder> = mutableSetOf()

    fun resetFolderOrders() {
        folders.sortedBy { it.ordering }.forEachIndexed { idx, f ->
            f.ordering = idx
        }
    }

    fun addFolder(folder: ScriptsFolder) {
        folders.add(folder)
        folders.forEachIndexed { idx, f ->
            f.ordering = idx
        }
    }

    fun removeFolder(folder: ScriptsFolder) {
        folders.remove(folder)
        folders.forEachIndexed { idx, f ->
            f.ordering = idx
        }
    }

}
