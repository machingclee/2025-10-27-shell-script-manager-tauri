package com.scriptmanager.applicationrunners

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.SystemLevel
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class DraftFolderInitialization(
    private val scriptsFolderRepository: ScriptsFolderRepository
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments) {
        println("[DraftFolderInitialization] Checking if Drafts folder exists...")

        // Migrate legacy "Draft" → "Drafts"
        val legacy = scriptsFolderRepository.findByNameAndSystemLevel("Drafts", SystemLevel.SYSTEM)
        if (legacy != null) {
            println("[DraftFolderInitialization] Renaming legacy 'Draft' folder to 'Drafts'...")
            legacy.name = "Drafts"
            scriptsFolderRepository.save(legacy)
            println("[DraftFolderInitialization] Renamed successfully.")
            return
        }
    }
}

