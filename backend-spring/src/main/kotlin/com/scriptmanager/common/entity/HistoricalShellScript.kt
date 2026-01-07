package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "historical_shell_script")
class HistoricalShellScript(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "shell_script_id", nullable = false)
    var shellScriptId: Int = 0,

    @Column(name = "execution_time", nullable = false)
    var executedAt: Double = 0.0,

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null

) {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shell_script_id", insertable = false, updatable = false)
    var shellScript: ShellScript? = null
}

