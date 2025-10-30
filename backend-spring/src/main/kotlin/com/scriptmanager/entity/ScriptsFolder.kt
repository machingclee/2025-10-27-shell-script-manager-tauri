package com.scriptmanager.entity

import jakarta.persistence.*

@Entity
@Table(name = "scripts_folder", indexes = [Index(columnList = "id")])
data class ScriptsFolder(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,
    
    @Column(nullable = false)
    val name: String = "",
    
    @Column(nullable = false)
    val ordering: Int = 0,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Double = 0.0,
    
    @Column(name = "created_at_hk", nullable = false)
    val createdAtHk: String = "",
    
    @OneToMany(mappedBy = "scriptsFolder", cascade = [CascadeType.ALL], orphanRemoval = true)
    val relationships: List<RelScriptsFolderShellScript> = emptyList()
)

