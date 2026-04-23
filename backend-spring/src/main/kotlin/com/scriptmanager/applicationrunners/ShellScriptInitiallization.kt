package com.scriptmanager.applicationrunners


import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class ShellScriptInitiallization(
    private val shellScripRepository: ShellScriptRepository
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments) {
        println("[Processing]  Resetting all isEditing status of all items ...")
        shellScripRepository.resetAllScriptItemsIsEditingStatus()
        println("[Finished]    Resetting all isEditing status of all items ...")
    }
}